const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const invitesController = require('../controllers/invites.controller');
const inviteValidator = require('../validators/invite.validator');

const inviteLookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות — נסה שוב מאוחר יותר' },
});

// Public — invite token lookup (before user is logged in)
router.get('/:token', inviteLookupLimiter, validate(inviteValidator.byToken), invitesController.getByToken);

// Accept invite (must be logged in)
router.post('/:token/accept', authenticate, validate(inviteValidator.byToken), invitesController.accept);

module.exports = router;
