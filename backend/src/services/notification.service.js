const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Contract = require('../models/Contract');
const { paginate } = require('../utils/pagination');

async function create({ contractId, userId, type, title, body, actionUrl, metadata }) {
  return Notification.create({ contractId, userId, type, title, body, actionUrl, metadata });
}

async function notifyOtherParticipants(contract, senderId, { type, title, body, ...rest }) {
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
        metadata:   rest,
      }),
    ),
  );
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

module.exports = { create, notifyOtherParticipants, listForUser, markAllRead, markRead };
