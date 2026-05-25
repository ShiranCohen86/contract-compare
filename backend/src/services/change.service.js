const Contract = require('../models/Contract');
const Clause = require('../models/Clause');
const ClauseChange = require('../models/ClauseChange');
const FinalApproval = require('../models/FinalApproval');
const ApiError = require('../utils/ApiError');
const { assertParticipant, assertNotObserver } = require('./contract.service');
const notificationService = require('./notification.service');
const { notifyUserWithEmail } = notificationService;
const { emitToContract } = require('./socket.service');
const { paginate } = require('../utils/pagination');

const TERMINAL_STATUSES = ['CANCELLED', 'APPROVED', 'EXPORTED'];

async function listByContract(contractId, userId, query) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  const filter = { contractId, status: 'PENDING' };
  return paginate(ClauseChange, filter, query, {
    populate: [
      { path: 'proposedById', select: 'name email' },
      { path: 'clauseId',     select: 'title position' },
    ],
  });
}

async function approve(changeId, userId) {
  const change = await ClauseChange.findById(changeId).populate('clauseId');
  if (!change) throw ApiError.notFound('Change not found');
  if (change.status !== 'PENDING') throw ApiError.badRequest('Change is no longer pending');

  const contract = await Contract.findById(change.contractId);
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  const TERMINAL = TERMINAL_STATUSES;
  if (TERMINAL.includes(contract.status)) throw ApiError.badRequest('Cannot modify changes on a contract in this status');

  if (String(change.proposedById) === userId) throw ApiError.forbidden('Cannot approve your own change');

  change.status = 'APPROVED';
  change.respondedById = userId;
  change.respondedAt = new Date();
  await change.save();

  // Apply the change to the clause
  await applyChange(change);

  // Broadcast to everyone in the contract room so all clients refresh
  emitToContract(String(change.contractId), 'contract:updated', { type: 'change_approved', changeId: String(change._id) });

  // Notify proposer (in-app + email)
  await notifyUserWithEmail(change.proposedById, contract, {
    type:     'CHANGE_APPROVED',
    title:    'השינוי שלך אושר',
    body:     change.clauseId?.title || undefined,
    metadata: { changeId: String(change._id) },
  });

  // Check if all changes approved → ready for final approval
  await checkReadyForFinal(contract);

  return change;
}

async function reject(changeId, userId, reason) {
  const change = await ClauseChange.findById(changeId);
  if (!change) throw ApiError.notFound('Change not found');
  if (change.status !== 'PENDING') throw ApiError.badRequest('Change is no longer pending');

  const contract = await Contract.findById(change.contractId);
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  if (TERMINAL.includes(contract.status)) throw ApiError.badRequest('Cannot modify changes on a contract in this status');

  if (String(change.proposedById) === userId) throw ApiError.forbidden('Cannot reject your own change');

  change.status = 'REJECTED';
  change.respondedById = userId;
  change.respondedAt = new Date();
  change.rejectReason = reason || undefined;
  await change.save();

  // Revert clause state
  await revertPendingState(change);

  emitToContract(String(change.contractId), 'contract:updated', { type: 'change_rejected', changeId: String(change._id) });

  // Notify proposer (in-app + email)
  await notifyUserWithEmail(change.proposedById, contract, {
    type:   'CHANGE_REJECTED',
    title:  'השינוי שלך נדחה',
    reason,
    metadata: { changeId: String(change._id), reason },
  });

  // Rejection might resolve all pending changes → check for final approval readiness
  await checkReadyForFinal(contract);

  return change;
}

async function withdraw(changeId, userId) {
  const change = await ClauseChange.findById(changeId);
  if (!change) throw ApiError.notFound('Change not found');
  if (change.status !== 'PENDING') throw ApiError.badRequest('Change is no longer pending');
  if (String(change.proposedById) !== userId) throw ApiError.forbidden('Only the proposer can withdraw');

  change.status = 'WITHDRAWN';
  await change.save();

  await revertPendingState(change);

  emitToContract(String(change.contractId), 'contract:updated', { type: 'change_withdrawn', changeId: String(change._id) });

  // Withdrawal might resolve all pending changes → check for final approval readiness
  await checkReadyForFinal(change.contractId);

  return change;
}

async function applyChange(change) {
  if (change.changeType === 'ADD') {
    await Clause.updateOne({ _id: change.clauseId }, { $set: { status: 'ACTIVE' } });
  } else if (change.changeType === 'EDIT') {
    const update = { content: change.newContent, status: 'ACTIVE' };
    if (change.newTitle !== undefined) update.title = change.newTitle;
    await Clause.updateOne({ _id: change.clauseId }, { $set: update });
  } else if (change.changeType === 'DELETE') {
    await Clause.updateOne({ _id: change.clauseId }, { $set: { status: 'DELETED' } });
  }
}

async function revertPendingState(change) {
  if (change.changeType === 'ADD') {
    // Remove the pending clause entirely
    await Clause.deleteOne({ _id: change.clauseId, status: 'PENDING_ADD' });
  } else if (change.changeType === 'DELETE') {
    await Clause.updateOne({ _id: change.clauseId }, { $set: { status: 'ACTIVE' } });
  }
  // EDIT leaves the original clause untouched — nothing to revert
}

async function checkReadyForFinal(contractOrId) {
  const contractId = contractOrId._id || contractOrId;
  const pending = await ClauseChange.countDocuments({ contractId, status: 'PENDING' });
  if (pending > 0) return;

  // Re-fetch to avoid stale state conflicts
  const contract = await Contract.findById(contractId);
  if (!contract) return;

  const isNegotiating = contract.status === 'NEGOTIATING';
  const isAwaiting    = contract.status === 'AWAITING_REVIEW';
  if (!isNegotiating && !isAwaiting) return;

  contract.status = 'PENDING_FINAL';
  await contract.save();

  // Notify all participants (in-app + email)
  const userIds = contract.participants.map((p) => p.userId);
  await Promise.all(
    userIds.map((uid) =>
      notifyUserWithEmail(uid, contract, {
        type:  'FINAL_APPROVAL_READY',
        title: 'החוזה מוכן לאישור סופי',
        body:  'כל השינויים אושרו — ניתן לתת אישור סופי',
      }),
    ),
  );
}

module.exports = { listByContract, approve, reject, withdraw };
