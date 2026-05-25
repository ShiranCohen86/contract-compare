const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Contract = require('../models/Contract');
const ClauseChange = require('../models/ClauseChange');
const FinalApproval = require('../models/FinalApproval');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

// ── Token helpers ─────────────────────────────────────────────────────────────

function hashJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

function signTokens(user) {
  const payload = { sub: String(user._id) };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const jti = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken, jtiHash: hashJti(jti) };
}

function pushSession(user, { jtiHash, userAgent, ip }) {
  user.sessions.push({ jtiHash, userAgent, ip, lastSeen: new Date() });
  if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
}

// ── Signup ────────────────────────────────────────────────────────────────────

async function signup({ name, email, password, userAgent, ip }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('כתובת האימייל כבר בשימוש');

  const user = new User({ name: name.trim(), email: email.toLowerCase(), isActive: true });
  await user.setPassword(password);
  await user.save();

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.signup', ip, userAgent, meta: { email, name } }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

// Dummy hash — used when user not found to prevent email enumeration via timing
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

// ── Login ─────────────────────────────────────────────────────────────────────

async function login({ email, password, userAgent, ip }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  // Always run bcrypt to prevent timing-based email enumeration
  const hashToCheck = (user?.isActive && user?.passwordHash) ? user.passwordHash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCheck);

  if (!user || !user.isActive || !ok) {
    AuditLog.create({ action: 'auth.login.failed', ip, userAgent, meta: { email } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.login', ip, userAgent, meta: { email: user.email } }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── Refresh (with rotation) ───────────────────────────────────────────────────

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (!payload.jti) throw ApiError.unauthorized('Invalid refresh token format');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized();

  const jtiHash = hashJti(payload.jti);
  const sessionIdx = user.sessions.findIndex((s) => s.jtiHash === jtiHash);
  if (sessionIdx === -1) throw ApiError.unauthorized('Refresh token revoked or already used');

  const oldSession = user.sessions[sessionIdx];
  user.sessions.splice(sessionIdx, 1);

  const { accessToken, refreshToken: newRefresh, jtiHash: newJtiHash } = signTokens(user);
  pushSession(user, { jtiHash: newJtiHash, userAgent: oldSession.userAgent, ip: oldSession.ip });
  await user.save();

  return { accessToken, refreshToken: newRefresh };
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(userId) {
  await User.updateOne({ _id: userId }, { $set: { sessions: [] } });
  AuditLog.create({ userId, action: 'auth.logout' }).catch(() => {});
}

// ── Profile ───────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function updateProfile(userId, patch) {
  const allowed = ['name'];
  const update = {};
  for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

// ── Password reset ────────────────────────────────────────────────────────────

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return { ok: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return { ok: true, devToken: env.NODE_ENV !== 'production' ? rawToken : undefined };
}

async function resetPassword({ token, newPassword }) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Invalid or expired reset token');
  await user.setPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.sessions = [];
  await user.save();
  return { ok: true };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password incorrect');
  await user.setPassword(newPassword);
  await user.save();
  return { ok: true };
}

// ── GDPR — Export user data ───────────────────────────────────────────────────

async function exportUserData(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const [contracts, changes, approvals, notifications, auditLogs] = await Promise.all([
    Contract.find({ $or: [{ ownerId: userId }, { 'participants.userId': userId }] }).lean(),
    ClauseChange.find({ proposedById: userId }).lean(),
    FinalApproval.find({ userId }).lean(),
    Notification.find({ userId }).lean(),
    AuditLog.find({ userId }).lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile:    user.toJSON(),
    contracts,
    changes,
    approvals,
    notifications,
    auditLogs,
  };
}

// ── GDPR — Delete account ─────────────────────────────────────────────────────

async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  // Require password confirmation before irreversible deletion
  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Password confirmation failed');

  // Anonymize instead of hard-delete to preserve contract integrity
  const anon = `deleted_${crypto.randomBytes(8).toString('hex')}@deleted.invalid`;
  user.name                 = 'Deleted User';
  user.email                = anon;
  user.isActive             = false;
  user.passwordHash         = undefined;
  user.sessions             = [];
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  user.deletedAt            = new Date();
  await user.save();

  // Remove personal notifications
  await Notification.deleteMany({ userId });
  AuditLog.create({ userId, action: 'gdpr.account_deleted', meta: {} }).catch(() => {});
  return { ok: true };
}

module.exports = { signTokens, signup, login, refresh, logout, getProfile, updateProfile, requestPasswordReset, resetPassword, changePassword, exportUserData, deleteAccount };
