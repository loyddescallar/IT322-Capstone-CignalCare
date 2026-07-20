const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { sendChatbotMessage } = require('../controllers/chatbotController');

const router = express.Router();

router.post(
  '/message',
  authRequired,
  requireRole('user'),
  sendChatbotMessage
);

module.exports = router;
