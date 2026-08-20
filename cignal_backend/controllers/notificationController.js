const {
  getNotificationsForUser,
  markNotificationsRead,
  markNotificationRead,
  createNotification,
  createAdminNotification: createAdminNotificationForAdmins,
} = require('../models/notificationModel');

async function getMyNotifications(req, res) {
  const notifications = await getNotificationsForUser(
    req.user.id,
    req.user.accountNumber
  );

  return res.json({ notifications });
}

async function markMyNotificationsRead(req, res) {
  const updated = await markNotificationsRead(
    req.user.id,
    req.user.accountNumber
  );

  return res.json({ message: 'Notifications marked as read', updated });
}


async function markMyNotificationRead(req, res) {
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  const updated = await markNotificationRead(
    notificationId,
    req.user.id,
    req.user.accountNumber
  );

  if (!updated) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  return res.json({ message: 'Notification marked as read' });
}

async function createAdminNotification(req, res) {
  const { user_id, account_number, type, message, target } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (target === 'admins') {
    const updated = await createAdminNotificationForAdmins({
      type: type || 'admin_info',
      message: message.trim(),
    });

    return res.status(201).json({
      message: 'Admin notification created',
      updated,
    });
  }

  const id = await createNotification({
    user_id,
    account_number,
    type,
    message: message.trim(),
  });

  return res.status(201).json({ message: 'Notification created', id });
}

module.exports = {
  getMyNotifications,
  markMyNotificationsRead,
  markMyNotificationRead,
  createAdminNotification,
};
