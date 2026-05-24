const Contract = require('../models/Contract');
const Clause = require('../models/Clause');
const ClauseChange = require('../models/ClauseChange');
const FinalApproval = require('../models/FinalApproval');
const ApiError = require('../utils/ApiError');
const { assertParticipant, assertNotObserver } = require('./contract.service');
const notificationService = require('./notification.service');

async function list(contractId, userId) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  const approvals = await FinalApproval.find({ contractId })
    .populate('userId', 'name email')
    .lean();

  const participantIds = contract.participants.map((p) => String(p.userId));
  const approvedIds = approvals.filter((a) => a.approved).map((a) => String(a.userId));
  const allApproved = participantIds.every((id) => approvedIds.includes(id));

  return { approvals, allApproved, participantCount: participantIds.length, approvedCount: approvedIds.length };
}

async function submit(contractId, userId, { comment, ipAddress, userAgent }) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);
  assertNotObserver(contract, userId);

  if (!['AWAITING_REVIEW', 'PENDING_FINAL'].includes(contract.status)) {
    throw ApiError.badRequest('Contract is not ready for final approval');
  }

  // Ensure no pending changes remain
  const pendingChanges = await ClauseChange.countDocuments({ contractId, status: 'PENDING' });
  if (pendingChanges > 0) throw ApiError.badRequest('There are still pending changes to resolve');

  // Block re-submission — preserve original IP/userAgent for legal audit trail
  const existing = await FinalApproval.findOne({ contractId, userId });
  if (existing) throw ApiError.conflict('You have already submitted your final approval');

  await FinalApproval.create({ contractId, userId, approved: true, comment, ipAddress, userAgent });

  // Check if all participants approved
  const participantIds = contract.participants.map((p) => String(p.userId));
  const approvals = await FinalApproval.find({ contractId, approved: true }).lean();
  const approvedIds = approvals.map((a) => String(a.userId));
  const allApproved = participantIds.every((id) => approvedIds.includes(id));

  if (allApproved) {
    // Create snapshot of the contract content
    const clauses = await Clause.find({ contractId, status: 'ACTIVE' }).sort({ position: 1 }).lean();
    contract.status = 'APPROVED';
    contract.snapshot = { clauses, approvedAt: new Date() };
    await contract.save();

    // Notify all participants
    await Promise.all(
      participantIds.map((uid) =>
        notificationService.create({
          contractId,
          userId: uid,
          type:   'CONTRACT_APPROVED',
          title:  'החוזה אושר על ידי כל הצדדים!',
          body:   'ניתן עכשיו לייצא את החוזה ל-PDF/DOCX',
        }),
      ),
    );
  } else {
    // Notify other participants that this user approved
    const otherIds = participantIds.filter((id) => id !== userId);
    await Promise.all(
      otherIds.map((uid) =>
        notificationService.create({
          contractId,
          userId: uid,
          type:   'PARTNER_APPROVED',
          title:  'הצד השני נתן אישור סופי',
          body:   'ממתין לאישורך',
        }),
      ),
    );
  }

  return { ok: true, allApproved };
}

module.exports = { list, submit };
