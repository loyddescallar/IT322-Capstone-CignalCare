const {
  TICKET_STATUSES,
  ensureTicketWorkflowSchema,
  createTicket,
  getTicketsByUser,
  getAllTickets,
  getTicketsPage,
  getTicketById,
  updateTicketStatus,
  archiveTicket,
} = require('../models/ticketModel');
const { createNotification, createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const { isAdmin, isSelf } = require('../utils/ownership');
const { linkTicketIfActive } = require('../models/incidentModel');
const pool = require('../config/db');
const { getFilteredTicketPage } = require('../utils/adminFilteredLists');
const { parseAdminPagination, paginationMeta } = require('../utils/adminPagination');

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

    // The ticket is already saved. Incident linking is supplementary and must
    // never turn a successful INSERT into a misleading HTTP 500 (retry/duplicate).
    let linkedIncident = null;
    try {
      linkedIncident = await linkTicketIfActive(id, req.user.location, `${category} ${subject}`);
    } catch (incidentError) {
      console.warn('TICKET INCIDENT LINK WARNING:', incidentError?.message || incidentError);
    }

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

    return res.status(201).json({ message: 'Ticket created', id, incident: linkedIncident || null });
  } catch (err) {
    console.error('CREATE TICKET ERROR', err);
    if (err?.code === 'SCHEMA_NOT_READY') {
      return res.status(503).json({ error: 'Local database schema is incomplete. Ask the developer to run the read-only C2 schema check.' });
    }
    return res.status(500).json({ error: 'Unable to create a ticket. Check the backend terminal for details.' });
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
    const paging = parseAdminPagination(req.query);
    if (paging.error) return res.status(400).json({ error: paging.error });
    if (paging.enabled) {
      if (req.query.view === 'filtered') {
        await ensureTicketWorkflowSchema();
        const { tickets, total, summary } = await getFilteredTicketPage(pool, paging, req.query);
        return res.json({ tickets, pagination: paginationMeta(paging.page, paging.pageSize, total), summary });
      }
      const {tickets, total} = await getTicketsPage(paging);
      return res.json({ tickets, pagination: paginationMeta(paging.page, paging.pageSize, total) });
    }
    // Preserve the unchanged response for existing admin UI and integrations.
    const tickets = await getAllTickets();
    return res.json({ tickets });
  } catch (err) {
    console.error('GET ALL TICKETS ERROR', err);
    return res.status(err.statusCode === 400 ? 400 : 500).json({ error: err.statusCode === 400 ? err.message : 'Server error' });
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
