import axiosClient from './axiosClient';

export async function sendChatbotMessage({ message, context = [] }) {
  const response = await axiosClient.post('/chatbot/message', {
    message,
    context,
  });

  return response.data;
}
