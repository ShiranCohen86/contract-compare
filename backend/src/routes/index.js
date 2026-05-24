const router = require('express').Router();

router.use('/auth',          require('./auth.routes'));
router.use('/contracts',     require('./contracts.routes'));
router.use('/clauses',       require('./clauses.routes'));
router.use('/changes',       require('./changes.routes'));
router.use('/invites',       require('./invites.routes'));
router.use('/approvals',     require('./approvals.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/export',        require('./export.routes'));
router.use('/admin',         require('./admin.routes'));

module.exports = router;
