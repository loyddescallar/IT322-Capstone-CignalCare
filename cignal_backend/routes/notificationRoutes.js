const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const { getMyNotifications, markMyNotificationsRead, markMyNotificationRead, createAdminNotification } = require('../controllers/notificationController');

router.get('/', authRequired, asyncHandler(getMyNotifications));
router.patch('/read-all', authRequired, asyncHandler(markMyNotificationsRead));
router.patch('/:id/read', authRequired, asyncHandler(markMyNotificationRead));
router.post('/', authRequired, requireRole('admin'), asyncHandler(createAdminNotification));

module.exports = router;
