// controllers/ticketController.js
const {
  createTicket,
  getTicketsByUser,
  getAllTickets,
  updateTicketStatus,
  getTicketById,
  deleteTicket
} = require("../models/ticketModel");

// Keep backend + DB values as the source of truth.
// (The DB schema uses: Open, In Progress, Resolved, Closed)
const ALLOWED_TICKET_STATUSES = new Set([
  "Open",
  "In Progress",
  "Resolved",
  "Closed"
]);

function normalizeTicketStatus(status) {
  if (!status) return status;

  // Backwards compatibility: older UI used "Ongoing".
  if (status === "Ongoing") return "In Progress";

  return status;
}

async function createTicketController(req, res) {
  try {
    const { category, subject } = req.body;

    if (!category || !subject) {
      return res
        .status(400)
        .json({ error: "category and subject are required" });
    }

    const id = await createTicket({
      user_id: req.user.id,
      category,
      subject
    });

    return res.status(201).json({ message: "Ticket created", id });
  } catch (err) {
    console.error("CREATE TICKET ERROR", err);
    return res.status(500).json({ error: "Server error creating ticket" });
  }
}

async function getMyTicketsController(req, res) {
  try {
    const tickets = await getTicketsByUser(req.user.id);
    return res.json({ tickets });
  } catch (err) {
    console.error("GET MY TICKETS ERROR", err);
    return res.status(500).json({ error: "Server error fetching tickets" });
  }
}

async function getAllTicketsController(req, res) {
  try {
    const tickets = await getAllTickets();
    return res.json({ tickets });
  } catch (err) {
    console.error("GET ALL TICKETS ERROR", err);
    return res.status(500).json({ error: "Server error fetching tickets" });
  }
}

async function getTicketByIdController(req, res) {
  try {
    const { id } = req.params;
    const ticket = await getTicketById(id);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const isAdmin = req.user && req.user.role === "admin";
    const isOwner = req.user && Number(ticket.user_id) === Number(req.user.id);

    // ✅ Security: users may only access their own tickets.
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden: you do not have access to this ticket."
      });
    }

    return res.json({ ticket });
  } catch (err) {
    console.error("GET TICKET ERROR", err);
    return res.status(500).json({ error: "Server error fetching ticket" });
  }
}

async function updateTicketStatusController(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const normalizedStatus = normalizeTicketStatus(status);

    if (!ALLOWED_TICKET_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Allowed: ${Array.from(ALLOWED_TICKET_STATUSES).join(
          ", "
        )}`
      });
    }

    // Optional but nice: give a proper 404 if the ticket doesn't exist.
    const existing = await getTicketById(id);
    if (!existing) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    await updateTicketStatus(id, normalizedStatus);

    return res.json({ message: "Ticket status updated" });
  } catch (err) {
    console.error("UPDATE STATUS ERROR", err);
    return res.status(500).json({ error: "Server error updating status" });
  }
}

async function deleteTicketController(req, res) {
  try {
    const { id } = req.params;

    await deleteTicket(id);

    return res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("DELETE TICKET ERROR", err);
    return res.status(500).json({ error: "Server error deleting ticket" });
  }
}

module.exports = {
  createTicketController,
  getMyTicketsController,
  getAllTicketsController,
  updateTicketStatusController,
  getTicketByIdController,
  deleteTicketController
};
