const ApiError = require('../utils/ApiError');

function requireAdmin(req, _res, next) {
  if (!req.user?.isAdmin) return next(ApiError.forbidden('Admin access required'));
  next();
}

module.exports = { requireAdmin };
