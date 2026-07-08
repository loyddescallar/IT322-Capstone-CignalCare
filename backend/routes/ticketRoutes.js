// routes/ticketRoutes.js
const express = require("express");
const router = express.Router();

const {
  createTicketController,
  getMyTicketsController,
  getAllTicketsController,
  updateTicketStatusController,
  getTicketByIdController,
  deleteTicketController
} = require("../controllers/ticketController");

const {
  sendMessageController,
  getMessagesController
} = require("../controllers/messageController");

const { authRequired, requireRole } = require("../middleware/auth");
const uploadMessage = require("../middleware/uploadMessage");

const { setUserTyping, setAdminTyping } = require("../utils/typingStore");

// -------------------------------
// Exact admin routes first
// -------------------------------
router.get("/admin", authRequired, requireRole("admin"), getAllTicketsController);
router.patch("/admin/:id", authRequired, requireRole("admin"), updateTicketStatusController);
router.delete("/admin/:id", authRequired, requireRole("admin"), deleteTicketController);

// -------------------------------
// User ticket routes
// -------------------------------
router.post("/", authRequired, createTicketController);
router.get("/my", authRequired, getMyTicketsController);

// -------------------------------
// Messages
// -------------------------------
router.get("/:id/messages", authRequired, getMessagesController);

router.post(
  "/:id/messages",
  authRequired,
  uploadMessage.single("attachment"),
  sendMessageController
);

// -------------------------------
// Typing Indicator
// -------------------------------
router.post("/:id/typing/user", authRequired, (req, res) => {
  setUserTyping(req.params.id, req.body.typing === true);
  res.json({ success: true });
});

router.post("/:id/typing/admin", authRequired, requireRole("admin"), (req, res) => {
  setAdminTyping(req.params.id, req.body.typing === true);
  res.json({ success: true });
});

// -------------------------------
// MUST BE LAST: dynamic route
// -------------------------------
router.get("/:id", authRequired, getTicketByIdController);

module.exports = router;
