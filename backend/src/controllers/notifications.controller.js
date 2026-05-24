const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await notificationService.listForUser(req.user.id, req.query);
  res.json(result);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  res.json({ ok: true });
});

exports.markRead = asyncHandler(async (req, res) => {
  await notificationService.markRead(req.params.id, req.user.id);
  res.json({ ok: true });
});
