const {
  generateGeminiReply,
  generateGeminiSupportDraft,
  buildFallbackSupportDraft,
  getGeminiModel,
} = require('../services/geminiService');
const {
  getChatbotKnowledge,
  buildChatbotUiHints,
  buildTroubleshootingSessionContext,
} = require('../services/chatbotKnowledgeService');

function sanitizeContext(context, limit = 8) {
  if (!Array.isArray(context)) return [];

  return context.slice(-limit).map((item) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    text: String(item?.text || '').trim().slice(0, 700),
  }));
}

function sanitizeTroubleshootingSession(session) {
  if (!session || typeof session !== 'object') return null;

  const cleanResult = (value) => {
    const clean = String(value || '').trim().toLowerCase();
    return ['resolved', 'not_resolved', 'viewed', 'unresolved'].includes(clean)
      ? clean
      : '';
  };

  return {
    version: 1,
    modelId: String(session.modelId || '').trim().slice(0, 100),
    issueId: String(session.issueId || '').trim().slice(0, 100),
    guideMode: session.guideMode === 'video' ? 'video' : 'written',
    activeOption: ['recommended', 'quick', 'factory', 'video'].includes(
      String(session.activeOption || '')
    )
      ? String(session.activeOption)
      : 'recommended',
    currentStepId: String(session.currentStepId || '').trim().slice(0, 160),
    currentStepIndex: Math.max(
      -1,
      Math.min(100, Number.isFinite(Number(session.currentStepIndex))
        ? Math.trunc(Number(session.currentStepIndex))
        : -1)
    ),
    completedStepIds: Array.isArray(session.completedStepIds)
      ? session.completedStepIds.map((id) => String(id).slice(0, 160)).slice(0, 40)
      : [],
    quickRestartAttempted: session.quickRestartAttempted === true,
    quickRestartResult: cleanResult(session.quickRestartResult),
    factoryResetAttempted: session.factoryResetAttempted === true,
    factoryResetResult: cleanResult(session.factoryResetResult),
    videoWatched: session.videoWatched === true,
    videoId: String(session.videoId || '').trim().slice(0, 120),
    videoResult: cleanResult(session.videoResult),
    overallResult: cleanResult(session.overallResult),
  };
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

// Offline support deliberately avoids fabricating customer-specific statuses or
// receiver-specific instructions. The verified guides remain the source of truth.
function buildOfflineSupportReply(message) {
  const input = String(message || '').toLowerCase();
  const prefix = '**Built-in support mode** (live AI is not enabled for this demo).\n\n';
  if (/(my|ko|akin|status|latest|progress|update)/i.test(input) &&
      /(ticket|technician|payment|load request)/i.test(input)) {
    return prefix + 'I cannot verify your personal request status in offline mode. Please open My Tickets, Technician Requests, or Load History to see your actual records. I will not invent a status.';
  }
  if (/(no signal|walang signal|black screen|blank screen|no picture|e-?\d+|error)/i.test(input)) {
    return prefix + 'For signal, picture, or error-code concerns, open **Troubleshooting** and select the correct receiver model and symptom. Follow only the verified steps shown there. If the problem remains, file a support ticket or request a technician.';
  }
  if (/(technician|repair|dish|alignment|cable|visit)/i.test(input)) {
    return prefix + 'For an on-site concern, select **Request Technician**, enter your service address, contact number, and issue details, and review the request before submitting.';
  }
  if (/(ticket|report|problem|concern)/i.test(input)) {
    return prefix + 'To report a concern, open **Report a Problem**, enter a short subject and description, then check **My Tickets** for the submitted record.';
  }
  if (/(load|reload|plan|subscription|payment|paymongo|price|channel)/i.test(input)) {
    return prefix + 'For current prepaid plans, amounts, and request status, use **Load Request** or **Load History**. Offline mode cannot confirm a payment or invent a current plan price.';
  }
  return prefix + 'Kumusta! I can guide you to verified troubleshooting, problem reports, technician requests, and prepaid-load pages. Describe your issue (such as "no signal"), or select one of the options below.';
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

  // An academic demo must remain useful when the optional Gemini integration is
  // deliberately disabled or its shared quota provider is not configured.
  // Never claim that a deterministic reply is AI-generated or verified live data.
  if (!req.aiAccess?.allowed) {
    if (req.aiAccess?.reason === 'quota') {
      return res.status(429).json({
        error: 'AI limit reached. Please use built-in troubleshooting or try again later.',
      });
    }
    const context = sanitizeContext(req.body?.context);
    const session = sanitizeTroubleshootingSession(req.body?.troubleshootingSession);
    const hints = buildChatbotUiHints(message, context, session);
    const reply = buildOfflineSupportReply(message);
    return res.json({
      reply,
      source: 'built-in-support',
      quickReplies: hints.quickReplies.length
        ? hints.quickReplies
        : ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
      actions: hints.actions,
      knowledge: null,
    });
  }

  const context = sanitizeContext(req.body?.context);
  const troubleshootingSession = sanitizeTroubleshootingSession(
    req.body?.troubleshootingSession
  );
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
        troubleshootingSession,
      });
      knowledgeText = knowledge.text;
      hasPersonalData = Boolean(knowledge.personalSupport);
      knowledgeMeta = {
        needs: knowledge.needs,
        requestedIds: knowledge.requestedIds,
        activeTroubleshootingSession: knowledge.activeTroubleshootingSession,
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

    const hints = buildChatbotUiHints(message, context, troubleshootingSession);

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
  const troubleshootingSession = sanitizeTroubleshootingSession(
    req.body?.troubleshootingSession
  );
  const verifiedSession = buildTroubleshootingSessionContext(
    troubleshootingSession
  );
  const hasUserContent = context.some(
    (item) => item.role === 'user' && String(item.text || '').trim()
  );

  if (!hasUserContent && !verifiedSession.valid) {
    return res.status(400).json({ error: 'Conversation or troubleshooting context is required' });
  }

  if (!req.aiAccess?.allowed) {
    return res.json({
      draft: buildFallbackSupportDraft({
        context,
        target,
        troubleshootingSessionText: verifiedSession.draftText,
      }),
      source: 'built-in-fallback',
      requiresReview: true,
    });
  }

  try {
    const draft = await generateGeminiSupportDraft({
      context,
      target,
      troubleshootingSessionText: verifiedSession.draftText,
    });

    return res.json({
      draft,
      source: 'gemini',
      requiresReview: true,
    });
  } catch (error) {
    console.error('CIGNALBOT SUPPORT DRAFT FALLBACK:', error?.message || error);

    return res.json({
      draft: buildFallbackSupportDraft({
        context,
        target,
        troubleshootingSessionText: verifiedSession.draftText,
      }),
      source: 'built-in-fallback',
      requiresReview: true,
    });
  }
}

module.exports = {
  sendChatbotMessage,
  prepareSupportDraft,
  shouldIncludePersonalData,
  sanitizeTroubleshootingSession,
  buildOfflineSupportReply,
};
