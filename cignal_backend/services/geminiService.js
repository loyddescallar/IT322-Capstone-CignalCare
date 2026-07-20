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

function buildInput(message, context) {
  const recentConversation = sanitizeContext(context);
  const transcript = recentConversation
    .map((item) => `${item.role}: ${item.text}`)
    .join('\n');

  return [
    transcript ? 'Recent conversation context:' : '',
    transcript,
    transcript ? '' : '',
    `Current user message: ${message}`,
    '',
    'Answer the current user message only. Do not claim access to live customer records unless verified data is explicitly included above.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function generateGeminiReply({ message, context = [] }) {
  const ai = await getGeminiClient();

  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    store: false,
    system_instruction: CIGNALCARE_ASSISTANT_PROMPT,
    input: buildInput(message, context),
    generation_config: {
      thinking_level: 'low',
      temperature: 0.35,
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
