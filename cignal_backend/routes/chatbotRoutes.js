const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { aiUsageGuard } = require('../middleware/aiUsageGuard');
const {
  sendChatbotMessage,
  prepareSupportDraft,
} = require('../controllers/chatbotController');

const router = express.Router();

// Authenticate once; both paid-model entrypoints must pass the same gate.
router.use(authRequired, requireRole('user'), aiUsageGuard);
router.post('/message', sendChatbotMessage);
router.post('/support-draft', prepareSupportDraft);

module.exports = router;
