const CIGNALCARE_ASSISTANT_PROMPT = require('../prompts/cignalCareAssistantPrompt');

let clientPromise = null;

function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim();
}

function getGeminiModel() {
  return String(process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();
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

function sanitizeContext(context = []) {
  if (!Array.isArray(context)) return [];

  return context
    .slice(-8)
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
    'Answer the current user message only. Use verified system data when relevant. Do not claim access to personal customer records unless such records are explicitly included in the verified data.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function generateGeminiReply({ message, context = [], knowledgeText = '' }) {
  const ai = await getGeminiClient();

  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    store: false,
    system_instruction: CIGNALCARE_ASSISTANT_PROMPT,
    input: buildInput(message, context, knowledgeText),
    generation_config: {
      thinking_level: 'low',
      temperature: 0.25,
    },
  });

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

module.exports = {
  generateGeminiReply,
  getGeminiModel,
};
