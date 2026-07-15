const {
  TICKET_STATUSES,
  createTicket,
  getTicketsByUser,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  archiveTicket,
} = require('../models/ticketModel');
const { createNotification, createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const { isAdmin, isSelf } = require('../utils/ownership');

function canAccessTicket(req, ticket) {
  return ticket && (isAdmin(req) || isSelf(req, ticket.user_id));
}

async function createTicketController(req, res) {
  try {
    const { category, subject } = req.body;

    if (!category || !subject) {
      return res.status(400).json({ error: 'category and subject are required' });
    }

    const id = await createTicket({
      user_id: req.user.id,
      category: category.trim(),
      subject: subject.trim(),
    });

    await notifySafely('CREATE TICKET', async () => {
      await createNotification({
        user_id: req.user.id,
        account_number: req.user.accountNumber,
        type: 'ticket',
        message: `Your ticket #${id} was submitted and is now Submitted.`,
      });

      await createAdminNotification({
        type: 'admin_ticket',
        message: `New support ticket #${id} from ${req.user.accountName}: ${subject.trim()}.`,
      });
    });

    return res.status(201).json({ message: 'Ticket created', id });
  } catch (err) {
    console.error('CREATE TICKET ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyTicketsController(req, res) {
  try {
    const tickets = await getTicketsByUser(req.user.id);
    return res.json({ tickets });
  } catch (err) {
    console.error('GET MY TICKETS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAllTicketsController(req, res) {
  try {
    const tickets = await getAllTickets();
    return res.json({ tickets });
  } catch (err) {
    console.error('GET ALL TICKETS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getTicketByIdController(req, res) {
  try {
    const ticket = await getTicketById(req.params.id);

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'Forbidden' });

    return res.json({ ticket });
  } catch (err) {
    console.error('GET TICKET ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateTicketStatusController(req, res) {
  try {
    const { status } = req.body;

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (ticket.status === status) {
      return res.json({ message: 'Ticket already has this status', unchanged: true });
    }

    await updateTicketStatus(req.params.id, status);

    await notifySafely('UPDATE TICKET', () =>
      createNotification({
        user_id: ticket.user_id,
        account_number: ticket.accountNumber,
        type: 'ticket_status',
        message: `Your ticket #${ticket.id} status was updated to ${status}.`,
      })
    );

    return res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('UPDATE TICKET ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteTicketController(req, res) {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await archiveTicket(req.params.id);

    await notifySafely('ARCHIVE TICKET', () =>
      createNotification({
        user_id: ticket.user_id,
        account_number: ticket.accountNumber,
        type: 'ticket_archived',
        message: `Your ticket #${ticket.id} was archived by admin.`,
      })
    );

    return res.json({ message: 'Ticket archived' });
  } catch (err) {
    console.error('ARCHIVE TICKET ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createTicketController,
  getMyTicketsController,
  getAllTicketsController,
  getTicketByIdController,
  updateTicketStatusController,
  deleteTicketController,
};
