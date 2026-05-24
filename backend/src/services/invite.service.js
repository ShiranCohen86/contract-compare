const { nanoid } = require('nanoid');
const Contract = require('../models/Contract');
const ContractInvite = require('../models/ContractInvite');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const notificationService = require('./notification.service');

const INVITE_EXPIRY_DAYS = 7;

async function send(contractId, senderId, email, role = 'COUNTERPARTY') {
  if (!['COUNTERPARTY', 'OBSERVER'].includes(role)) throw ApiError.badRequest('Invalid role');
  const contract = await Contract.findById(contractId).populate('ownerId', 'name email');
  if (!contract) throw ApiError.notFound('Contract not found');
  if (String(contract.ownerId._id) !== senderId) throw ApiError.forbidden('Only the owner can invite participants');

  const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existingUser) {
    const alreadyIn = contract.participants.some((p) => String(p.userId) === String(existingUser._id));
    if (alreadyIn) throw ApiError.conflict('User is already a participant');
  }

  // Invalidate previous pending invites to same email for this contract
  await ContractInvite.updateMany(
    { contractId, email: email.toLowerCase(), status: 'PENDING' },
    { $set: { status: 'EXPIRED' } },
  );

  const token = nanoid(21);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await ContractInvite.create({
    contractId,
    email:       email.toLowerCase(),
    token,
    role,
    status:      'PENDING',
    expiresAt,
    invitedById: senderId,
  });

  await emailService.sendInvite({
    to:           email,
    inviterName:  contract.ownerId.name,
    contractTitle: contract.title,
    token,
  });

  return invite;
}

async function getByToken(token) {
  const invite = await ContractInvite.findOne({ token })
    .populate('contractId', 'title description ownerId')
    .populate('invitedById', 'name email');
  if (!invite) throw ApiError.notFound('Invite not found');

  if (invite.status === 'ACCEPTED') throw ApiError.badRequest('Invite already accepted');
  if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
    invite.status = 'EXPIRED';
    await invite.save();
    throw ApiError.badRequest('Invite has expired');
  }

  return invite;
}

async function accept(token, userId) {
  const invite = await ContractInvite.findOne({ token });
  if (!invite) throw ApiError.notFound('Invite not found');
  if (invite.status !== 'PENDING') throw ApiError.badRequest('Invite is no longer valid');
  if (invite.expiresAt < new Date()) throw ApiError.badRequest('Invite has expired');

  const contract = await Contract.findById(invite.contractId);
  if (!contract) throw ApiError.notFound('Contract not found');

  const alreadyIn = contract.participants.some((p) => String(p.userId) === userId);
  if (!alreadyIn) {
    contract.participants.push({ userId, role: invite.role || 'COUNTERPARTY', joinedAt: new Date() });
    if (contract.status === 'DRAFT' && invite.role !== 'OBSERVER') {
      contract.status = 'AWAITING_REVIEW';
    }
    await contract.save();
  }

  invite.status = 'ACCEPTED';
  await invite.save();

  // Notify owner
  await notificationService.create({
    contractId: contract._id,
    userId:     contract.ownerId,
    type:       'INVITE_ACCEPTED',
    title:      'הצד השני הצטרף לחוזה',
    body:       invite.email,
  });

  return contract;
}

module.exports = { send, getByToken, accept };
