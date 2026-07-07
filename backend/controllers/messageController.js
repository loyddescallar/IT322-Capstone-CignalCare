// controllers/messageController.js
const { createMessage, getMessages } = require("../models/messageModel");
const { getTicketById } = require("../models/ticketModel");
const { getTypingStatus } = require("../utils/typingStore");

async function assertTicketAccess(req, res, ticketId) {
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return null;
  }

  const isAdmin = req.user && req.user.role === "admin";
  const isOwner = req.user && Number(ticket.user_id) === Number(req.user.id);

  // ✅ Security: users may only access their own tickets/messages.
  if (!isAdmin && !isOwner) {
    res.status(403).json({
      error: "Forbidden: you do not have access to this ticket."
    });
    return null;
  }

  return ticket;
}

async function sendMessageController(req, res) {
  try {
    const { id } = req.params; // ticket_id
    const { message } = req.body;

    // Authorization guard
    const ticket = await assertTicketAccess(req, res, id);
    if (!ticket) return;

    const sender_role = req.user.role;
    const sender_id = req.user.id;

    // Attachment handling
    const attachment = req.file ? req.file.filename : null;
    const attachment_type = req.file ? req.file.mimetype : null;

    // Reject ONLY if both message AND attachment are missing
    if ((!message || message.trim() === "") && !attachment) {
      return res
        .status(400)
        .json({ error: "Message or attachment is required." });
    }

    const msgId = await createMessage({
      ticket_id: id,
      sender_id,
      sender_role,
      message: message || null,
      attachment,
      attachment_type
    });

    return res.json({ message: "Message sent", id: msgId });
  } catch (err) {
    console.error("SEND MESSAGE ERROR", err);
    return res.status(500).json({ error: "Server error sending message" });
  }
}

async function getMessagesController(req, res) {
  try {
    const { id } = req.params;

    // Authorization guard
    const ticket = await assertTicketAccess(req, res, id);
    if (!ticket) return;

    const messages = await getMessages(id);
    const typing = getTypingStatus(id);

    return res.json({
      messages,
      typing
    });
  } catch (err) {
    console.error("GET MESSAGES ERROR", err);
    return res.status(500).json({ error: "Server error fetching messages" });
  }
}

module.exports = {
  sendMessageController,
  getMessagesController
};
