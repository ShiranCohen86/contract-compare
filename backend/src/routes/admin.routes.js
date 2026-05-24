const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const adminController = require('../controllers/admin.controller');

router.use(authenticate, requireAdmin);

router.get('/stats',                      adminController.stats);

router.get('/users',                      adminController.listUsers);
router.patch('/users/:id/deactivate',     adminController.deactivateUser);
router.patch('/users/:id/activate',       adminController.activateUser);
router.patch('/users/:id/make-admin',     adminController.makeAdmin);

router.get('/contracts',                  adminController.listContracts);
router.get('/audit-logs',                 adminController.listAuditLogs);

module.exports = router;
