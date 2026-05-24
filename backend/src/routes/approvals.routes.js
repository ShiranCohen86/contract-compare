const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const approvalsController = require('../controllers/approvals.controller');
const approvalValidator = require('../validators/approval.validator');

router.use(authenticate);

router.get('/:contractId',        validate(approvalValidator.byContractId), approvalsController.list);
router.post('/:contractId/approve', validate(approvalValidator.submit),    approvalsController.approve);

module.exports = router;
