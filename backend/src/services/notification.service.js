const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');
const { emitToUser } = require('./socket.service');
const emailService = require('./email.service');
const logger = require('../utils/logger');

async function create({ contractId, userId, type, title, body, actionUrl, metadata }) {
  const notif = await Notification.create({ contractId, userId, type, title, body, actionUrl, metadata });
  // Push real-time to the user's personal socket room
  emitToUser(String(userId), 'notification:new', notif.toObject());
  return notif;
}

async function notifyOtherParticipants(contract, senderId, { type, title, body, changeType, ...rest }) {
  const otherIds = contract.participants
    .map((p) => String(p.userId))
    .filter((id) => id !== senderId);

  await Promise.all(
    otherIds.map((uid) =>
      create({
        contractId: contract._id,
        userId:     uid,
        type,
        title,
        body,
        metadata:   { changeType, ...rest },
      }),
    ),
  );

  // Fire-and-forget emails (log failures, don't swallow silently)
  if (type === 'CLAUSE_ADDED' || type === 'CHANGE_PROPOSED') {
    User.find({ _id: { $in: otherIds } }).select('email').lean().then((users) => {
      users.forEach((u) => {
        emailService.sendChangeProposed({
          to:            u.email,
          contractTitle: contract.title,
          contractId:    String(contract._id),
          changeType:    changeType || type,
        }).catch((err) => logger.error('sendChangeProposed failed', { to: u.email, err: err.message }));
      });
    }).catch((err) => logger.error('notifyOtherParticipants email lookup failed', { err: err.message }));
  }
}

async function notifyUserWithEmail(userId, contract, { type, title, body, changeType, reason, ...rest }) {
  await create({
    contractId: contract._id,
    userId,
    type,
    title,
    body,
    metadata:   { changeType, reason, ...rest },
  });

  User.findById(userId).select('email').lean().then((u) => {
    if (!u?.email) return;
    const emailArgs = { contractTitle: contract.title, contractId: String(contract._id) };
    const onFail = (err) => logger.error('notifyUserWithEmail send failed', { type, to: u.email, err: err.message });
    if (type === 'CHANGE_APPROVED') {
      emailService.sendChangeApproved({ to: u.email, ...emailArgs }).catch(onFail);
    } else if (type === 'CHANGE_REJECTED') {
      emailService.sendChangeRejected({ to: u.email, ...emailArgs, reason }).catch(onFail);
    } else if (type === 'FINAL_APPROVAL_READY') {
      emailService.sendFinalApprovalReady({ to: u.email, ...emailArgs }).catch(onFail);
    }
  }).catch((err) => logger.error('notifyUserWithEmail user lookup failed', { userId, err: err.message }));
}

async function listForUser(userId, query) {
  const uid = new mongoose.Types.ObjectId(userId);
  const filter = { userId: uid };
  if (query.unread === 'true') filter.isRead = false;

  return paginate(Notification, filter, query, {
    sort: '-createdAt',
  });
}

async function markAllRead(userId) {
  await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
}

async function markRead(notificationId, userId) {
  await Notification.updateOne({ _id: notificationId, userId }, { $set: { isRead: true } });
}

module.exports = { create, notifyOtherParticipants, notifyUserWithEmail, listForUser, markAllRead, markRead };
