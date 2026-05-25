const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Contract = require('../models/Contract');
const AuditLog = require('../models/AuditLog');
const { paginate } = require('../utils/pagination');

// GET /admin/users
exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const re = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  const result = await paginate(User, filter, req.query);
  res.json(result);
});

// PATCH /admin/users/:id/deactivate
exports.deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: false, sessions: [] } }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user: user.toJSON() });
});

// PATCH /admin/users/:id/activate
exports.activateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: true } }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user: user.toJSON() });
});

// PATCH /admin/users/:id/make-admin
exports.makeAdmin = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isAdmin: true } }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user: user.toJSON() });
});

// GET /admin/contracts
exports.listContracts = asyncHandler(async (req, res) => {
  const VALID_STATUSES = ['DRAFT', 'AWAITING_REVIEW', 'NEGOTIATING', 'PENDING_FINAL', 'APPROVED', 'EXPORTED', 'CANCELLED'];
  const filter = {};
  if (req.query.status && VALID_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const result = await paginate(Contract, filter, req.query, {
    populate: [{ path: 'ownerId', select: 'name email' }],
  });
  res.json(result);
});

// GET /admin/audit-logs
exports.listAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.userId)     filter.userId     = req.query.userId;
  if (req.query.action)     filter.action     = new RegExp(req.query.action, 'i');
  if (req.query.contractId) filter.contractId = req.query.contractId;
  const result = await paginate(AuditLog, filter, req.query, {
    populate: [{ path: 'userId', select: 'name email' }],
    sort: '-createdAt',
  });
  res.json(result);
});

// GET /admin/stats
exports.stats = asyncHandler(async (req, res) => {
  const [totalUsers, activeUsers, totalContracts, byStatus] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    Contract.countDocuments({}),
    Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const contractsByStatus = {};
  byStatus.forEach(({ _id, count }) => { contractsByStatus[_id] = count; });

  res.json({ totalUsers, activeUsers, totalContracts, contractsByStatus });
});
