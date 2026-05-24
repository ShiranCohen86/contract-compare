const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const changesController = require('../controllers/changes.controller');
const changeValidator = require('../validators/change.validator');

router.use(authenticate);

// List pending changes for a contract
router.get('/contract/:contractId', changesController.listByContract);

// Respond to a change
router.post('/:id/approve',   validate(changeValidator.byId), changesController.approve);
router.post('/:id/reject',    validate(changeValidator.reject), changesController.reject);
router.post('/:id/withdraw',  validate(changeValidator.byId), changesController.withdraw);

module.exports = router;
