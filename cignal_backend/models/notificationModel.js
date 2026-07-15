const pool = require('../config/db');

async function getNotificationsForUser(userId, accountNumber) {
  const [rows] = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = ? OR account_number = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId, accountNumber || '']
  );

  return rows;
}

async function markNotificationsRead(userId, accountNumber) {
  const [result] = await pool.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? OR account_number = ?`,
    [userId, accountNumber || '']
  );

  return result.affectedRows;
}

async function createNotification(data) {
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, account_number, type, message, is_read)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.user_id || null,
      data.account_number || null,
      data.type || 'info',
      data.message,
      data.is_read ? 1 : 0,
    ]
  );

  return result.insertId;
}

async function createAdminNotification(data) {
  const [admins] = await pool.query(
    `SELECT id, accountNumber
     FROM users
     WHERE role = 'admin'
       AND COALESCE(status, 'active') = 'active'`
  );

  if (!admins.length) {
    return 0;
  }

  const values = admins.map((admin) => [
    admin.id,
    admin.accountNumber || null,
    data.type || 'admin_info',
    data.message,
    data.is_read ? 1 : 0,
  ]);

  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, account_number, type, message, is_read)
     VALUES ?`,
    [values]
  );

  return result.affectedRows;
}

module.exports = {
  getNotificationsForUser,
  markNotificationsRead,
  createNotification,
  createAdminNotification,
};
