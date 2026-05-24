const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const invitesController = require('../controllers/invites.controller');
const inviteValidator = require('../validators/invite.validator');

// Public — invite token lookup (before user is logged in)
router.get('/:token', validate(inviteValidator.byToken), invitesController.getByToken);

// Accept invite (must be logged in)
router.post('/:token/accept', authenticate, validate(inviteValidator.byToken), invitesController.accept);

module.exports = router;
