const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const {
  sendChatbotMessage,
  prepareSupportDraft,
} = require('../controllers/chatbotController');

const router = express.Router();

router.post(
  '/message',
  authRequired,
  requireRole('user'),
  sendChatbotMessage
);

router.post(
  '/support-draft',
  authRequired,
  requireRole('user'),
  prepareSupportDraft
);

module.exports = router;
