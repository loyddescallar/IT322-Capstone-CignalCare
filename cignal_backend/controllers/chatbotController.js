const {
  generateGeminiReply,
  generateGeminiSupportDraft,
  buildFallbackSupportDraft,
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

function sanitizeContext(context, limit = 8) {
  if (!Array.isArray(context)) return [];

  return context.slice(-limit).map((item) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    text: String(item?.text || '').trim().slice(0, 700),
  }));
}

function shouldIncludePersonalData(message, context = []) {
  const recentUserText = Array.isArray(context)
    ? context
        .slice(-4)
        .filter((item) => item?.role !== 'assistant')
        .map((item) => String(item?.text || ''))
        .join(' ')
    : '';

  const text = `${message} ${recentUserText}`.toLowerCase();

  const recordTerms = /(ticket|technician|tech request|load request|payment)/i;
  const ownershipOrStatusTerms = /(my|mine|ko|akin|aking|status|latest|update|progress|ano na|kamusta|where is|what happened|#\s*\d+|number\s*\d+)/i;

  return recordTerms.test(text) && ownershipOrStatusTerms.test(text);
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

  const context = sanitizeContext(req.body?.context);
  const includePersonalData = shouldIncludePersonalData(message, context);

  try {
    let knowledgeText = '';
    let hasPersonalData = false;
    let knowledgeMeta = null;

    try {
      const knowledge = await getChatbotKnowledge({
        userId: req.user?.id,
        includePersonalData,
        message,
        context,
      });
      knowledgeText = knowledge.text;
      hasPersonalData = Boolean(knowledge.personalSupport);
      knowledgeMeta = {
        needs: knowledge.needs,
        requestedIds: knowledge.requestedIds,
      };
    } catch (knowledgeError) {
      console.error('CHATBOT KNOWLEDGE ERROR:', knowledgeError?.message);
      // Gemini remains available even if a system-data lookup temporarily fails.
    }

    const result = await generateGeminiReply({
      message,
      context,
      knowledgeText,
    });

    const hints = buildChatbotUiHints(message, context);

    return res.json({
      reply: result.reply,
      source: hasPersonalData
        ? 'gemini+system-data+personal-data'
        : knowledgeText
          ? 'gemini+system-data'
          : 'gemini',
      quickReplies: hints.quickReplies,
      actions: hints.actions,
      knowledge: knowledgeMeta,
    });
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0);

    if (error.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'AI assistance is not configured',
      });
    }

    if (error.code === 'GEMINI_TIMEOUT') {
      return res.status(504).json({
        error: 'AI assistance took too long to respond',
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

async function prepareSupportDraft(req, res) {
  const target = String(req.body?.target || 'ticket').trim().toLowerCase();

  if (!['ticket', 'technician'].includes(target)) {
    return res.status(400).json({ error: 'Invalid support draft target' });
  }

  const context = sanitizeContext(req.body?.context, 12);
  const hasUserContent = context.some(
    (item) => item.role === 'user' && String(item.text || '').trim()
  );

  if (!hasUserContent) {
    return res.status(400).json({ error: 'Conversation context is required' });
  }

  try {
    const draft = await generateGeminiSupportDraft({ context, target });

    return res.json({
      draft,
      source: 'gemini',
      requiresReview: true,
    });
  } catch (error) {
    console.error('CIGNALBOT SUPPORT DRAFT FALLBACK:', error?.message || error);

    return res.json({
      draft: buildFallbackSupportDraft({ context, target }),
      source: 'built-in-fallback',
      requiresReview: true,
    });
  }
}

module.exports = {
  sendChatbotMessage,
  prepareSupportDraft,
  shouldIncludePersonalData,
};
