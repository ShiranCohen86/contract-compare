const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const contractsController = require('../controllers/contracts.controller');
const contractValidator = require('../validators/contract.validator');
const invitesController = require('../controllers/invites.controller');
const inviteValidator = require('../validators/invite.validator');

router.use(authenticate);

router.get('/',    contractsController.list);
router.post('/',   validate(contractValidator.create), contractsController.create);
router.get('/:id', validate(contractValidator.getById), contractsController.getById);
router.patch('/:id', validate(contractValidator.update), contractsController.update);
router.delete('/:id', validate(contractValidator.delete), contractsController.remove);

// Participant actions
router.post('/:id/leave',  contractsController.leave);
router.post('/:id/cancel', validate(contractValidator.cancel), contractsController.cancel);

// Invites nested under contracts
router.post('/:contractId/invites', validate(inviteValidator.send), invitesController.send);

module.exports = router;
