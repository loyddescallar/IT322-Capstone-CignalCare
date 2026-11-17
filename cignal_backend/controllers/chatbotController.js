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
const {
  getChatbotPageKnowledge,
  isPageGuidanceQuestion,
} = require('../services/chatbotPageKnowledge');
const {
  getGuidedSupportReply,
  buildVerifiedPersonalStatusReply,
  isPrivateStatusQuestion,
} = require('../services/chatbotGuidedSupport');

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

  // Page navigation uses verified public guidance: no Gemini or DB wait.
  // Keep quota denials intact, even for navigation-only messages.
  const pageHelpForQuestion = getChatbotPageKnowledge(req.body?.page);
  if (req.aiAccess?.reason !== 'quota' && pageHelpForQuestion && isPageGuidanceQuestion(message)) {
    const hints = buildChatbotUiHints(message, [], null);
    return res.json({
      reply: `**${pageHelpForQuestion.title}**\n\n${pageHelpForQuestion.guidance}`,
      source: 'built-in-support',
      quickReplies: hints.quickReplies.length ? hints.quickReplies : ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
      actions: hints.actions,
      knowledge: null,
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
    const pageHelp = getChatbotPageKnowledge(req.body?.page);
    const verifiedSession = buildTroubleshootingSessionContext(session);
    const guided = getGuidedSupportReply({
      message, context,
      verifiedSession: { ...verifiedSession, completedStepIds: session?.completedStepIds || [] },
    });
    let personalStatus = null;
    // Read-only, owner-scoped status lookup. This never invokes Gemini or writes
    // records, and falls back safely if the database is temporarily unavailable.
    if (req.user?.id && isPrivateStatusQuestion(message, context)) {
      try {
        const verified = await getChatbotKnowledge({
          userId: req.user.id, includePersonalData: true,
          message, context, troubleshootingSession: session,
        });
        personalStatus = buildVerifiedPersonalStatusReply({
          message, context,
          personalSupport: verified?.personalSupport,
          requestedIds: verified?.requestedIds,
        });
      } catch (error) {
        console.warn('CIGNALBOT OFFLINE STATUS LOOKUP UNAVAILABLE:', error?.message);
      }
    }
    const reply = personalStatus || (pageHelp && isPageGuidanceQuestion(message)
      ? `**${pageHelp.title}**\n\n${pageHelp.guidance}`
      : guided?.reply || buildOfflineSupportReply(message));
    const actions = [...hints.actions];
    for (const action of guided?.actions || []) {
      if (!actions.some(item => item.path === action.path)) actions.push(action);
    }
    return res.json({
      reply,
      source: personalStatus ? 'built-in-support+verified-personal-data' : 'built-in-support',
      quickReplies: guided?.quickReplies?.length
        ? guided.quickReplies
        : hints.quickReplies.length
          ? hints.quickReplies
          : ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
      actions,
      knowledge: null,
    });
  }

  const context = sanitizeContext(req.body?.context);
  const troubleshootingSession = sanitizeTroubleshootingSession(
    req.body?.troubleshootingSession
  );
  const includePersonalData = shouldIncludePersonalData(message, context);
  const pageHelp = getChatbotPageKnowledge(req.body?.page);
  const guided = getGuidedSupportReply({
    message, context,
    verifiedSession: {
      ...buildTroubleshootingSessionContext(troubleshootingSession),
      completedStepIds: troubleshootingSession?.completedStepIds || [],
    },
  });

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
      knowledgeText: [knowledgeText, pageHelp?.context || '',
        guided?.reply ? `NON-AUTHORITATIVE GUIDED SUPPORT SUGGESTION (not proof of device condition):\n${guided.reply}` : '',
      ].filter(Boolean).join('\n\n'),
    });

    const hints = buildChatbotUiHints(message, context, troubleshootingSession);
    const actions = [...hints.actions];
    for (const action of guided?.actions || []) {
      if (!actions.some(item => item.path === action.path)) actions.push(action);
    }

    return res.json({
      reply: result.reply,
      source: hasPersonalData
        ? 'gemini+system-data+personal-data'
        : knowledgeText
          ? 'gemini+system-data'
          : 'gemini',
      quickReplies: guided?.quickReplies?.length ? guided.quickReplies : hints.quickReplies,
      actions,
      knowledge: knowledgeMeta,
    });
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0);
    if (status === 429) {
      return res.status(429).json({
        error: 'AI assistance is temporarily busy. Please try again shortly.',
      });
    }

    console.warn('CIGNALBOT AI FALLBACK:', {
      code: String(error?.code || 'UNAVAILABLE').slice(0, 40),
      model: getGeminiModel(),
    });
    const hints = buildChatbotUiHints(message, context, troubleshootingSession);
    const actions = [...hints.actions];
    for (const action of guided?.actions || []) {
      if (!actions.some(item => item.path === action.path)) actions.push(action);
    }
    // Do not invent paid transactions, statuses or receiver conditions on AI failure.
    return res.json({
      reply: guided?.reply || buildOfflineSupportReply(message),
      source: 'built-in-support+ai-fallback',
      quickReplies: guided?.quickReplies?.length ? guided.quickReplies
        : hints.quickReplies.length ? hints.quickReplies
          : ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
      actions,
      knowledge: null,
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
