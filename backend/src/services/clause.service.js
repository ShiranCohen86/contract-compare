const xss = require('xss');
const Contract = require('../models/Contract');
const Clause = require('../models/Clause');
const ClauseChange = require('../models/ClauseChange');
const ApiError = require('../utils/ApiError');
const { assertParticipant, assertNotObserver } = require('./contract.service');
const notificationService = require('./notification.service');
const { emitToContract } = require('./socket.service');

// Strip all HTML — clauses are plain text, never rendered as HTML in app
const sanitize = (str) => (str ? xss(str, { whiteList: {}, stripIgnoreTag: true }) : str);

async function setNegotiatingIfNeeded(contract) {
  if (contract.status === 'AWAITING_REVIEW') {
    contract.status = 'NEGOTIATING';
    await contract.save();
  }
}

async function listByContract(contractId, userId) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  return Clause.find({ contractId, status: { $ne: 'DELETED' } }).sort({ position: 1 }).lean();
}

async function getNextPosition(contractId) {
  const last = await Clause.findOne({ contractId, status: { $ne: 'DELETED' } })
    .sort({ position: -1 })
    .select('position')
    .lean();
  return last ? last.position + 1 : 1;
}

async function create(contractId, userId, { title, content, position }) {
  content = sanitize(content);
  title   = sanitize(title);
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  const isOwner = String(contract.ownerId) === userId;
  const settings = contract.settings || Contract.DEFAULT_SETTINGS;
  const requiresApproval = settings.addRequiresApproval;

  const pos = position ?? (await getNextPosition(contractId));

  // If inserting at a specific position, shift existing clauses down
  if (position !== undefined && position !== null) {
    await Clause.updateMany(
      { contractId, position: { $gte: position }, status: { $ne: 'DELETED' } },
      { $inc: { position: 1 } },
    );
  }

  // If not requiring approval OR if owner in DRAFT — add directly as ACTIVE
  const directAdd = !requiresApproval || (isOwner && contract.status === 'DRAFT');
  const clauseStatus = directAdd ? 'ACTIVE' : 'PENDING_ADD';

  const clause = await Clause.create({
    contractId,
    title:     title?.trim(),
    content:   content.trim(),
    position:  pos,
    status:    clauseStatus,
    addedById: userId,
  });

  const change = await ClauseChange.create({
    contractId,
    clauseId:     clause._id,
    proposedById: userId,
    changeType:   'ADD',
    newContent:   content.trim(),
    status:       directAdd ? 'APPROVED' : 'PENDING',
  });

  if (!directAdd) {
    await setNegotiatingIfNeeded(contract);
    await notificationService.notifyOtherParticipants(contract, userId, {
      type:   'CLAUSE_ADDED',
      title:  'סעיף חדש ממתין לאישורך',
      body:   title ? `"${title}"` : undefined,
      changeId: String(change._id),
      clauseId: String(clause._id),
    });
  }

  emitToContract(String(contractId), 'contract:updated', { type: 'clause_added', clauseId: String(clause._id) });
  return { clause, change };
}

async function update(clauseId, userId, { title, content }) {
  if (content !== undefined) content = sanitize(content);
  if (title   !== undefined) title   = sanitize(title);
  const clause = await Clause.findById(clauseId);
  if (!clause) throw ApiError.notFound('Clause not found');
  if (!['ACTIVE'].includes(clause.status)) throw ApiError.badRequest('Cannot edit this clause in its current state');

  const contract = await Contract.findById(clause.contractId);
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  const settings = contract.settings || Contract.DEFAULT_SETTINGS;

  // [H-3] Prevent multiple concurrent EDIT changes on the same clause
  const existingPending = await ClauseChange.findOne({ clauseId: clause._id, changeType: 'EDIT', status: 'PENDING' });
  if (existingPending) throw ApiError.conflict('There is already a pending edit for this clause');

  // [C-4] If editRequiresApproval is false, apply directly (owner only, non-DRAFT is always approval flow)
  const isOwner = String(contract.ownerId) === userId;
  const requiresApproval = settings.editRequiresApproval !== false || !isOwner || contract.status !== 'DRAFT';

  if (!requiresApproval) {
    // Direct apply — update the clause immediately
    const updated = await Clause.findByIdAndUpdate(
      clauseId,
      { $set: { content: (content ?? clause.content).trim(), ...(title !== undefined && { title: title?.trim() }) } },
      { new: true },
    );
    const change = await ClauseChange.create({
      contractId:      clause.contractId,
      clauseId:        clause._id,
      proposedById:    userId,
      changeType:      'EDIT',
      previousContent: clause.content,
      newContent:      (content ?? clause.content).trim(),
      previousTitle:   clause.title,
      newTitle:        title?.trim(),
      status:          'APPROVED',
    });
    emitToContract(String(clause.contractId), 'contract:updated', { type: 'clause_edited', clauseId: String(clause._id) });
    return { clause: updated, change };
  }

  // Edit creates a change record; the clause content stays unchanged until approved
  const change = await ClauseChange.create({
    contractId:      clause.contractId,
    clauseId:        clause._id,
    proposedById:    userId,
    changeType:      'EDIT',
    previousContent: clause.content,
    newContent:      (content ?? clause.content).trim(),
    previousTitle:   clause.title,
    newTitle:        title?.trim(),
    status:          'PENDING',
  });

  await setNegotiatingIfNeeded(contract);
  await notificationService.notifyOtherParticipants(contract, userId, {
    type:   'CHANGE_PROPOSED',
    title:  'הוצעה עריכה לסעיף',
    body:   clause.title || undefined,
    changeId: String(change._id),
    clauseId: String(clause._id),
  });

  emitToContract(String(clause.contractId), 'contract:updated', { type: 'clause_edit_proposed', clauseId: String(clause._id) });
  return { clause, change };
}

async function remove(clauseId, userId) {
  const clause = await Clause.findById(clauseId);
  if (!clause) throw ApiError.notFound('Clause not found');
  if (!['ACTIVE'].includes(clause.status)) throw ApiError.badRequest('Cannot delete this clause in its current state');

  const contract = await Contract.findById(clause.contractId);
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  const settings = contract.settings || Contract.DEFAULT_SETTINGS;
  const isOwner = String(contract.ownerId) === userId;
  const requiresApproval = settings.deleteRequiresApproval !== false || !isOwner || contract.status !== 'DRAFT';

  if (!requiresApproval) {
    // Direct delete — hard delete the clause
    await Clause.deleteOne({ _id: clauseId });
    const change = await ClauseChange.create({
      contractId:      clause.contractId,
      clauseId:        clause._id,
      proposedById:    userId,
      changeType:      'DELETE',
      previousContent: clause.content,
      status:          'APPROVED',
    });
    return { clause, change };
  }

  // Mark as pending delete
  clause.status = 'PENDING_DELETE';
  await clause.save();

  const change = await ClauseChange.create({
    contractId:      clause.contractId,
    clauseId:        clause._id,
    proposedById:    userId,
    changeType:      'DELETE',
    previousContent: clause.content,
    status:          'PENDING',
  });

  await setNegotiatingIfNeeded(contract);
  await notificationService.notifyOtherParticipants(contract, userId, {
    type:   'CHANGE_PROPOSED',
    title:  'בקשת מחיקת סעיף',
    body:   clause.title || undefined,
    changeId: String(change._id),
    clauseId: String(clause._id),
  });

  emitToContract(String(clause.contractId), 'contract:updated', { type: 'clause_delete_proposed', clauseId: String(clause._id) });
  return { clause, change };
}

async function reorder(contractId, userId, orderedIds) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  const updates = orderedIds.map((id, index) =>
    Clause.updateOne({ _id: id, contractId }, { $set: { position: index + 1 } }),
  );
  await Promise.all(updates);

  return Clause.find({ contractId, status: { $ne: 'DELETED' } }).sort({ position: 1 }).lean();
}

module.exports = { listByContract, create, update, remove, reorder };
