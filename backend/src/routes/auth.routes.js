const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please try again later' },
});

// Stricter limiter for login — only counts failed attempts (4xx/5xx)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי נסיונות כניסה — נסה שוב בעוד 15 דקות' },
});

// Public
router.post('/signup',          authLimiter, validate(authValidator.signup),        authController.signup);
router.post('/login',           loginLimiter, validate(authValidator.login),         authController.login);
router.post('/refresh',         authLimiter, validate(authValidator.refresh),        authController.refresh);
router.post('/password/forgot', authLimiter, validate(authValidator.requestReset),   authController.requestPasswordReset);
router.post('/password/reset',  authLimiter, validate(authValidator.resetPassword),  authController.resetPassword);

// Authenticated
router.post('/logout',          authenticate, authController.logout);
router.get('/me',               authenticate, authController.me);
router.patch('/me',             authenticate, validate(authValidator.updateProfile),  authController.updateMe);
router.post('/password/change', authenticate, validate(authValidator.changePassword), authController.changePassword);

// GDPR
router.get('/me/data',   authenticate, authController.exportData);
router.delete('/me',     authenticate, validate(authValidator.deleteAccount), authController.deleteAccount);

module.exports = router;
