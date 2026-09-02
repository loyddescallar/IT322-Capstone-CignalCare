import axiosClient from './axiosClient';

export async function sendChatbotMessage({
  message,
  context = [],
  troubleshootingSession = null,
}) {
  const response = await axiosClient.post('/chatbot/message', {
    message,
    context,
    troubleshootingSession,
  });

  return response.data;
}

export async function prepareChatbotSupportDraft({
  target,
  context = [],
  troubleshootingSession = null,
}) {
  const response = await axiosClient.post('/chatbot/support-draft', {
    target,
    context,
    troubleshootingSession,
  });

  return response.data;
}
