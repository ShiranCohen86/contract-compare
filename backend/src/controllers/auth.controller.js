const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

function clientIp(req) {
  return (req.ip || '').replace(/^::ffff:/, '');
}

exports.signup = asyncHandler(async (req, res) => {
  const result = await authService.signup({
    name:      req.body.name,
    email:     req.body.email,
    password:  req.body.password,
    userAgent: req.headers['user-agent'] || '',
    ip:        clientIp(req),
  });
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email:     req.body.email,
    password:  req.body.password,
    userAgent: req.headers['user-agent'] || '',
    ip:        clientIp(req),
  });
  res.json(result);
});

exports.refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json(tokens);
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.json(profile);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user.id, req.body);
  res.json(profile);
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.json(result);
});

exports.exportData = asyncHandler(async (req, res) => {
  const data = await authService.exportUserData(req.user.id);
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json(data);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const result = await authService.deleteAccount(req.user.id, req.body.password);
  res.json(result);
});
