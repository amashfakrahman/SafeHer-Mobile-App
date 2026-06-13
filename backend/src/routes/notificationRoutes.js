const express = require('express');
const controller = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listNotifications);
router.post('/device', controller.registerDeviceToken);
router.post('/test', controller.sendTestNotification);

module.exports = router;
