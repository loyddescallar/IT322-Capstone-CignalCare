// In-memory typing status store
// ticketId: { user: bool, admin: bool }
const typingStatus = {};

module.exports = {
  getTypingStatus(ticketId) {
    if (!typingStatus[ticketId]) {
      typingStatus[ticketId] = { user: false, admin: false };
    }
    return typingStatus[ticketId];
  },

  setUserTyping(ticketId, isTyping) {
    if (!typingStatus[ticketId]) {
      typingStatus[ticketId] = { user: false, admin: false };
    }
    typingStatus[ticketId].user = isTyping;
  },

  setAdminTyping(ticketId, isTyping) {
    if (!typingStatus[ticketId]) {
      typingStatus[ticketId] = { user: false, admin: false };
    }
    typingStatus[ticketId].admin = isTyping;
  },
};
