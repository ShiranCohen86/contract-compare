const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

router.use(authenticate);

router.get('/',              notificationsController.list);
router.patch('/read-all',    notificationsController.markAllRead);
router.patch('/:id/read',    notificationsController.markRead);

module.exports = router;
