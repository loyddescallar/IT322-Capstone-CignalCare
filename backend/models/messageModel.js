// models/messageModel.js
const db = require("../config/db");

async function createMessage({ 
  ticket_id, 
  sender_id, 
  sender_role, 
  message, 
  attachment, 
  attachment_type 
}) {
  const [result] = await db.query(
    `INSERT INTO ticket_messages 
     (ticket_id, sender_id, sender_role, message, attachment, attachment_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ticket_id,
      sender_id,
      sender_role,
      message,
      attachment,
      attachment_type
    ]
  );

  return result.insertId;
}

async function getMessages(ticket_id) {
  const [rows] = await db.query(
    `SELECT * FROM ticket_messages
     WHERE ticket_id = ?
     ORDER BY created_at ASC`,
    [ticket_id]
  );

  return rows;
}

module.exports = {
  createMessage,
  getMessages
};
