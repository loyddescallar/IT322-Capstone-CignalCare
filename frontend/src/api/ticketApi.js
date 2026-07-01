// src/api/ticketApi.js
import axiosClient from "./axiosClient";

const ticketApi = {
  // ============================
  // USER ROUTES
  // ============================
  createTicket: (ticket) => axiosClient.post("/tickets", ticket),

  getMyTickets: () => axiosClient.get("/tickets/my"),

  getTicket: (id) => axiosClient.get(`/tickets/${id}`),

  // ============================
  // MESSAGES (Chat System)
  // ============================
  getTicketMessages: (id) =>
    axiosClient.get(`/tickets/${id}/messages`),

  // Text-only message
  sendTicketMessage: (id, message) =>
    axiosClient.post(`/tickets/${id}/messages`, { message }),

  // Message with attachment (and optional text)
  sendTicketAttachment: (id, { file, message }) => {
    const formData = new FormData();
    if (message) formData.append("message", message);
    if (file) formData.append("attachment", file);

    return axiosClient.post(`/tickets/${id}/messages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // ============================
  // TYPING INDICATOR
  // ============================
  sendUserTyping: (id, typing) =>
    axiosClient.post(`/tickets/${id}/typing/user`, { typing }),

  sendAdminTyping: (id, typing) =>
    axiosClient.post(`/tickets/${id}/typing/admin`, { typing }),

  // ============================
  // ADMIN ROUTES
  // ============================
  getAdminTickets: () => axiosClient.get("/tickets/admin"),

  updateTicketStatus: (id, status) =>
    axiosClient.patch(`/tickets/admin/${id}`, { status }),

  // ✅ NEW — Delete ticket (only admins)
  deleteTicket: (id) => axiosClient.delete(`/tickets/admin/${id}`),
};

export default ticketApi;
