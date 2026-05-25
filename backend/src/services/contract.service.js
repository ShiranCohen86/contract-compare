const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Clause = require('../models/Clause');
const ClauseChange = require('../models/ClauseChange');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

function oid(val) {
  // Works whether val is a populated Document, ObjectId, or plain string
  return String(val?._id ?? val);
}

function assertParticipant(contract, userId) {
  const isOwner       = oid(contract.ownerId) === userId;
  const isParticipant = contract.participants.some((p) => oid(p.userId) === userId);
  if (!isOwner && !isParticipant) throw ApiError.forbidden('Not a participant');
}

function getParticipantRole(contract, userId) {
  if (oid(contract.ownerId) === userId) return 'OWNER';
  const p = contract.participants.find((p) => oid(p.userId) === userId);
  return p?.role ?? null;
}

function assertNotObserver(contract, userId) {
  const role = getParticipantRole(contract, userId);
  if (role === 'OBSERVER') throw ApiError.forbidden('Observers cannot perform write actions');
}

async function listForUser(userId, query) {
  const uid = new mongoose.Types.ObjectId(userId);
  const filter = {
    $or: [{ ownerId: uid }, { 'participants.userId': uid }],
  };
  return paginate(Contract, filter, query, { populate: [{ path: 'ownerId', select: 'name email' }] });
}

async function create(userId, { title, description, settings, expiresAt }) {
  const merged = { ...Contract.DEFAULT_SETTINGS, ...(settings || {}) };
  const contract = await Contract.create({
    title:        title.trim(),
    description:  description?.trim(),
    ownerId:      userId,
    participants: [{ userId, role: 'OWNER', joinedAt: new Date() }],
    settings:     merged,
    expiresAt:    expiresAt || undefined,
  });
  return contract;
}

async function getById(contractId, userId) {
  const contract = await Contract.findById(contractId)
    .populate('ownerId', 'name email')
    .populate('participants.userId', 'name email');
  if (!contract) throw ApiError.notFound('Contract not found');
  assertParticipant(contract, userId);

  const clauses = await Clause.find({ contractId, status: { $ne: 'DELETED' } })
    .sort({ position: 1 })
    .lean();

  const pendingChanges = await ClauseChange.find({ contractId, status: 'PENDING' })
    .populate('proposedById', 'name email')
    .lean();

  return { contract, clauses, pendingChanges };
}

async function update(contractId, userId, patch) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  if (String(contract.ownerId) !== userId) throw ApiError.forbidden('Only the owner can update contract details');

  if (patch.title)                   contract.title       = patch.title.trim();
  if (patch.description !== undefined) contract.description = patch.description?.trim();
  if (patch.settings)                contract.settings    = { ...contract.settings, ...patch.settings };
  if (patch.expiresAt !== undefined) contract.expiresAt   = patch.expiresAt || undefined;

  await contract.save();
  return contract;
}

async function remove(contractId, userId) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  if (String(contract.ownerId) !== userId) throw ApiError.forbidden('Only the owner can delete the contract');
  if (!['DRAFT'].includes(contract.status)) throw ApiError.badRequest('Only DRAFT contracts can be deleted');

  await Promise.all([
    Contract.deleteOne({ _id: contractId }),
    Clause.deleteMany({ contractId }),
    ClauseChange.deleteMany({ contractId }),
  ]);
}

async function leave(contractId, userId) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');

  if (String(contract.ownerId) === userId) throw ApiError.badRequest('The owner cannot leave — delete or cancel the contract instead');
  if (['APPROVED', 'EXPORTED'].includes(contract.status)) throw ApiError.badRequest('Cannot leave a contract that is already approved');

  const idx = contract.participants.findIndex((p) => String(p.userId) === userId);
  if (idx === -1) throw ApiError.forbidden('Not a participant');

  contract.participants.splice(idx, 1);
  await contract.save();
}

async function cancel(contractId, userId, reason) {
  const contract = await Contract.findById(contractId);
  if (!contract) throw ApiError.notFound('Contract not found');
  if (String(contract.ownerId) !== userId) throw ApiError.forbidden('Only the owner can cancel the contract');
  if (['APPROVED', 'EXPORTED', 'CANCELLED'].includes(contract.status)) {
    throw ApiError.badRequest(`Cannot cancel a contract in status: ${contract.status}`);
  }

  contract.status = 'CANCELLED';
  contract.cancelReason = reason?.trim() || undefined;
  await contract.save();
  return contract;
}

module.exports = { listForUser, create, getById, update, remove, leave, cancel, assertParticipant, assertNotObserver, getParticipantRole };
