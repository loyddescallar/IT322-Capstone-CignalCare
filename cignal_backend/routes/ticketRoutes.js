const express = require('express');
const router = express.Router();
const { createTicketController, getMyTicketsController, getAllTicketsController, getTicketByIdController, updateTicketStatusController, deleteTicketController } = require('../controllers/ticketController');
const { sendMessageController, getMessagesController, getTicketAttachmentController, getTicketMessageAttachmentController } = require('../controllers/messageController');
const { authRequired, requireRole } = require('../middleware/auth');
const uploadMessage = require('../middleware/uploadMessage');
const { createAbuseRateLimit } = require('../middleware/abuseRateLimit');

router.get('/admin',        authRequired, requireRole('admin'), getAllTicketsController);
router.patch('/admin/:id',  authRequired, requireRole('admin'), updateTicketStatusController);
router.delete('/admin/:id', authRequired, requireRole('admin'), deleteTicketController);

router.post('/',  authRequired, createAbuseRateLimit('ticketCreate'), createTicketController);
router.get('/my', authRequired, getMyTicketsController);

// Lightweight no-op endpoints so the frontend typing calls do not 404 if enabled later.
router.post('/:id/typing/user',  authRequired, (_req, res) => res.json({ ok: true }));
router.post('/:id/typing/admin', authRequired, requireRole('admin'), (_req, res) => res.json({ ok: true }));

router.get('/:id/attachments/message/:messageId', authRequired, createAbuseRateLimit('attachmentRead'), getTicketMessageAttachmentController);
router.get('/:id/attachments/:filename', authRequired, getTicketAttachmentController);
router.get('/:id/messages',  authRequired, getMessagesController);
router.post('/:id/messages', authRequired, createAbuseRateLimit('ticketMessage'), uploadMessage.single('attachment'), sendMessageController);
router.get('/:id',           authRequired, getTicketByIdController);

module.exports = router;
