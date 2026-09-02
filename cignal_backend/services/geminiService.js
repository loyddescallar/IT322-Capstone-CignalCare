const CIGNALCARE_ASSISTANT_PROMPT = require('../prompts/cignalCareAssistantPrompt');

let clientPromise = null;

const TICKET_CATEGORIES = [
  'Connection Issue',
  'Technical Problem',
  'Billing Concern',
  'Channel Concern',
  'Technician Request',
  'Other',
];

const TECHNICIAN_SERVICES = [
  'Signal / Dish Repair',
  'Dish Realignment',
  'Cable Replacement',
  'Box Replacement',
  'New Installation',
  'Relocation',
  'Other',
];

function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim();
}

function getGeminiModel() {
  return String(process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();
}

function getGeminiTimeoutMs() {
  const configured = Number(process.env.GEMINI_TIMEOUT_MS || 15000);

  if (!Number.isFinite(configured)) return 15000;

  return Math.min(Math.max(Math.round(configured), 3000), 30000);
}

async function getGeminiClient() {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    const error = new Error('Gemini API is not configured');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  if (!clientPromise) {
    clientPromise = import('@google/genai').then(({ GoogleGenAI }) =>
      new GoogleGenAI({ apiKey })
    );
  }

  return clientPromise;
}

function sanitizeContext(context = [], limit = 8) {
  if (!Array.isArray(context)) return [];

  return context
    .slice(-limit)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'Assistant' : 'User',
      text: String(item?.text || '').trim().slice(0, 700),
    }))
    .filter((item) => item.text);
}

function buildInput(message, context, knowledgeText = '') {
  const recentConversation = sanitizeContext(context);
  const transcript = recentConversation
    .map((item) => `${item.role}: ${item.text}`)
    .join('\n');

  return [
    knowledgeText ? 'VERIFIED CIGNALCARE SYSTEM DATA:' : '',
    knowledgeText,
    knowledgeText ? '' : '',
    transcript ? 'RECENT CONVERSATION CONTEXT:' : '',
    transcript,
    transcript ? '' : '',
    `CURRENT USER MESSAGE: ${message}`,
    '',
    'Answer the current user message only. Use verified system data when relevant. Only discuss personal customer records when they are explicitly included in the authenticated personal-support section.',
  ]
    .filter(Boolean)
    .join('\n');
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Gemini request timed out after ${timeoutMs}ms`);
      error.code = 'GEMINI_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function generateGeminiReply({ message, context = [], knowledgeText = '' }) {
  const ai = await getGeminiClient();
  const timeoutMs = getGeminiTimeoutMs();

  const interaction = await withTimeout(
    ai.interactions.create({
      model: getGeminiModel(),
      store: false,
      system_instruction: CIGNALCARE_ASSISTANT_PROMPT,
      input: buildInput(message, context, knowledgeText),
      generation_config: {
        thinking_level: 'low',
        temperature: 0.25,
      },
    }),
    timeoutMs
  );

  const reply = String(interaction.output_text || '').trim();

  if (!reply) {
    const error = new Error('Gemini returned an empty response');
    error.code = 'GEMINI_EMPTY_RESPONSE';
    throw error;
  }

  return {
    reply,
    model: getGeminiModel(),
  };
}

function getUserTranscript(context = []) {
  return sanitizeContext(context, 12)
    .filter((item) => item.role === 'User')
    .map((item) => item.text)
    .filter(Boolean);
}

function classifyTicketCategory(text = '') {
  const normalized = String(text).toLowerCase();

  if (/(load|reload|payment|paymongo|billing|bayad|charge|receipt)/i.test(normalized)) {
    return 'Billing Concern';
  }

  if (/(channel|missing channel|skipping channel|subscription channel)/i.test(normalized)) {
    return 'Channel Concern';
  }

  if (/(technician|dish alignment|realign|repair visit)/i.test(normalized)) {
    return 'Technician Request';
  }

  if (/(no signal|walang signal|weak signal|connection|cable|lnb)/i.test(normalized)) {
    return 'Connection Issue';
  }

  if (/(remote|receiver|decoder|box|screen|audio|sound|power|error|smart card|hdmi|video)/i.test(normalized)) {
    return 'Technical Problem';
  }

  return 'Other';
}

function classifyTechnicianService(text = '') {
  const normalized = String(text).toLowerCase();

  if (/(realign|alignment|dish alignment)/i.test(normalized)) return 'Dish Realignment';
  if (/(cable|wire|coax|connector)/i.test(normalized)) return 'Cable Replacement';
  if (/(box replacement|replace.*box|receiver replacement|decoder replacement)/i.test(normalized)) return 'Box Replacement';
  if (/(new installation|install new|new install)/i.test(normalized)) return 'New Installation';
  if (/(relocation|relocate|transfer.*dish|move.*dish)/i.test(normalized)) return 'Relocation';
  if (/(signal|dish|no signal|weak signal|lnb)/i.test(normalized)) return 'Signal / Dish Repair';

  return 'Other';
}

function inferSubject(text = '') {
  const normalized = String(text).toLowerCase();

  if (/(no signal|walang signal)/i.test(normalized)) return 'No Signal concern';
  if (/(remote)/i.test(normalized)) return 'Remote control concern';
  if (/(missing channel|channel)/i.test(normalized)) return 'Channel availability concern';
  if (/(smart card|e1|e2|e11)/i.test(normalized)) return 'Smart Card concern';
  if (/(payment|paymongo|load|reload)/i.test(normalized)) return 'Load or payment concern';
  if (/(box|receiver|decoder)/i.test(normalized)) return 'Cignal box concern';
  if (/(audio|sound)/i.test(normalized)) return 'Audio concern';
  if (/(screen|picture|video|display)/i.test(normalized)) return 'TV display concern';

  return 'Cignal service concern';
}

function normalizeAllowed(value, allowed, fallback) {
  const clean = String(value || '').trim();
  const match = allowed.find((item) => item.toLowerCase() === clean.toLowerCase());
  return match || fallback;
}

function cleanDraftText(value, maxLength) {
  return String(value || '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()
    .slice(0, maxLength);
}

function buildFallbackSupportDraft({ context = [], target = 'ticket', troubleshootingSessionText = '' }) {
  const userMessages = getUserTranscript(context)
    .filter((message) => !/^(file a ticket|ticket|request technician|technician|tech)$/i.test(message.trim()))
    .slice(-5);

  const combined = [troubleshootingSessionText, ...userMessages]
    .filter(Boolean)
    .join(' ');
  const subject = inferSubject(combined);
  const descriptionParts = [
    'CignalBot-assisted draft. Please review and edit before submitting.',
  ];

  if (troubleshootingSessionText) {
    descriptionParts.push(
      '',
      'CignalCare+ troubleshooting session:',
      troubleshootingSessionText
    );
  }

  if (userMessages.length) {
    descriptionParts.push(
      '',
      'Subscriber messages:',
      ...userMessages.map((message) => `• ${message}`)
    );
  } else if (!troubleshootingSessionText) {
    descriptionParts.push(
      '',
      'Please describe the concern and review all details before submitting.'
    );
  }

  const description = descriptionParts.join('\n');

  return {
    subject,
    category: classifyTicketCategory(combined),
    serviceType: classifyTechnicianService(combined),
    description: description.slice(0, 1800),
    target,
  };
}

function parseSupportDraft(outputText, { context = [], target = 'ticket', troubleshootingSessionText = '' } = {}) {
  const fallback = buildFallbackSupportDraft({ context, target, troubleshootingSessionText });
  const text = String(outputText || '').replace(/\r/g, '').trim();

  const subjectMatch = text.match(/^SUBJECT:\s*(.+)$/im);
  const categoryMatch = text.match(/^CATEGORY:\s*(.+)$/im);
  const serviceMatch = text.match(/^SERVICE_TYPE:\s*(.+)$/im);
  const descriptionMatch = text.match(/^DESCRIPTION:\s*\n?([\s\S]*)$/im);

  const subject = cleanDraftText(subjectMatch?.[1] || fallback.subject, 100) || fallback.subject;
  const category = normalizeAllowed(
    categoryMatch?.[1],
    TICKET_CATEGORIES,
    fallback.category
  );
  const serviceType = normalizeAllowed(
    serviceMatch?.[1],
    TECHNICIAN_SERVICES,
    fallback.serviceType
  );
  const description = cleanDraftText(
    descriptionMatch?.[1] || fallback.description,
    1800
  ) || fallback.description;

  return {
    subject,
    category,
    serviceType,
    description,
    target,
  };
}

async function generateGeminiSupportDraft({ context = [], target = 'ticket', troubleshootingSessionText = '' }) {
  const ai = await getGeminiClient();
  const timeoutMs = getGeminiTimeoutMs();
  const recentConversation = sanitizeContext(context, 12);
  const transcript = recentConversation
    .map((item) => `${item.role}: ${item.text}`)
    .join('\n');

  if (!transcript && !troubleshootingSessionText) {
    return buildFallbackSupportDraft({ context, target, troubleshootingSessionText });
  }

  const input = `
Create a concise CignalCare+ support draft from the verified troubleshooting session and/or conversation below.
The subscriber will review and edit this before submitting it through the normal system form.

STRICT FACT RULES:
- Use only facts present in the verified troubleshooting session and transcript.
- Steps listed as "Marked completed in CignalCare+" may be described as steps the subscriber marked completed in the app.
- Never upgrade "marked completed" into a technician-confirmed diagnosis or inspection.
- Never claim the subscriber performed another troubleshooting step unless the transcript explicitly says they did it.
- Bot recommendations alone are not completed troubleshooting.
- Do not invent dates, error codes, account details, diagnoses, technician findings, or payment results.
- If a detail is unclear, leave it out rather than guessing.
- Keep the description practical and under 1200 characters.

Choose CATEGORY from exactly one of:
${TICKET_CATEGORIES.join(' | ')}

Choose SERVICE_TYPE from exactly one of:
${TECHNICIAN_SERVICES.join(' | ')}

Return exactly this plain-text format and nothing else:
SUBJECT: <short subject>
CATEGORY: <allowed category>
SERVICE_TYPE: <allowed service type>
DESCRIPTION:
<summary with Reported concern, CignalCare+ troubleshooting marked completed, shortcut/video results when available, and Current result if known>

TARGET FORM: ${target}

VERIFIED TROUBLESHOOTING SESSION:
${troubleshootingSessionText || 'None provided'}

CONVERSATION:
${transcript || 'No additional chat messages provided'}
  `.trim();

  const interaction = await withTimeout(
    ai.interactions.create({
      model: getGeminiModel(),
      store: false,
      system_instruction: 'You prepare factual support-form drafts for CignalCare+. Never invent facts and never perform system actions.',
      input,
      generation_config: {
        thinking_level: 'low',
        temperature: 0.1,
      },
    }),
    timeoutMs
  );

  const output = String(interaction.output_text || '').trim();
  if (!output) return buildFallbackSupportDraft({ context, target, troubleshootingSessionText });

  return parseSupportDraft(output, { context, target, troubleshootingSessionText });
}

module.exports = {
  generateGeminiReply,
  generateGeminiSupportDraft,
  buildFallbackSupportDraft,
  getGeminiModel,
  getGeminiTimeoutMs,
};
