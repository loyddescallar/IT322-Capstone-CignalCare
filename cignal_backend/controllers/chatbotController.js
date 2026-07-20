const {
  generateGeminiReply,
  getGeminiModel,
} = require('../services/geminiService');
const {
  getChatbotKnowledge,
  buildChatbotUiHints,
} = require('../services/chatbotKnowledgeService');

const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestWindows = new Map();

function checkRateLimit(userId) {
  const key = String(userId || 'anonymous');
  const now = Date.now();
  const current = requestWindows.get(key);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  current.count += 1;
  return true;
}

function sanitizeContext(context) {
  if (!Array.isArray(context)) return [];

  return context.slice(-8).map((item) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    text: String(item?.text || '').trim().slice(0, 700),
  }));
}

async function sendChatbotMessage(req, res) {
  const message = String(req.body?.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({
      error: 'Message must be 1000 characters or fewer',
    });
  }

  if (!checkRateLimit(req.user?.id)) {
    return res.status(429).json({
      error: 'Too many chatbot requests. Please wait a moment and try again.',
    });
  }

  try {
    let knowledgeText = '';

    try {
      const knowledge = await getChatbotKnowledge();
      knowledgeText = knowledge.text;
    } catch (knowledgeError) {
      console.error('CHATBOT KNOWLEDGE ERROR:', knowledgeError?.message);
      // Gemini remains available even if the system-data lookup temporarily fails.
    }

    const result = await generateGeminiReply({
      message,
      context: sanitizeContext(req.body?.context),
      knowledgeText,
    });

    const hints = buildChatbotUiHints(message);

    return res.json({
      reply: result.reply,
      source: knowledgeText ? 'gemini+system-data' : 'gemini',
      quickReplies: hints.quickReplies,
      actions: hints.actions,
    });
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0);

    if (error.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'AI assistance is not configured',
      });
    }

    if (status === 429) {
      return res.status(429).json({
        error: 'AI assistance is temporarily busy. Please try again shortly.',
      });
    }

    console.error('GEMINI CHATBOT ERROR:', {
      message: error?.message,
      model: getGeminiModel(),
    });

    return res.status(503).json({
      error: 'AI assistance is temporarily unavailable',
    });
  }
}

module.exports = {
  sendChatbotMessage,
};
