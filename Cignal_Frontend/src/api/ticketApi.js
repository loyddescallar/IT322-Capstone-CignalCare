import axiosClient from './axiosClient';

const ticketApi = {
  createTicket: (ticket) => axiosClient.post('/tickets', ticket),
  getMyTickets: () => axiosClient.get('/tickets/my'),
  getAdminTickets: () => axiosClient.get('/tickets/admin'),
  getTicket: (id) => axiosClient.get(`/tickets/${id}`),
  getTicketMessages: (id) => axiosClient.get(`/tickets/${id}/messages`),

  sendTicketMessage: (id, message) =>
    axiosClient.post(`/tickets/${id}/messages`, { message }),

  sendTicketAttachment: (id, { file, message = '' }) => {
    if (!file) {
      return axiosClient.post(`/tickets/${id}/messages`, {
        message: String(message || '').trim(),
      });
    }

    const formData = new FormData();
    const cleanMessage = String(message || '').trim();

    if (cleanMessage) {
      formData.append('message', cleanMessage);
    }

    formData.append('attachment', file, file.name || 'attachment');

    // Do not manually set multipart/form-data. The browser must add the
    // boundary value automatically.
    return axiosClient.post(`/tickets/${id}/messages`, formData);
  },

  sendUserTyping: (id, typing) =>
    axiosClient.post(`/tickets/${id}/typing/user`, { typing }),

  sendAdminTyping: (id, typing) =>
    axiosClient.post(`/tickets/${id}/typing/admin`, { typing }),

  updateTicketStatus: (id, status) =>
    axiosClient.patch(`/tickets/admin/${id}`, { status }),

  archiveTicket: (id) => axiosClient.delete(`/tickets/admin/${id}`),

  // Backward compatibility for older components.
  deleteTicket: (id) => axiosClient.delete(`/tickets/admin/${id}`),
};

export default ticketApi;
