'use strict';

// Only public UI workflow guidance belongs here. Never trust the browser's
// current-page hint as authorization, or as proof that an action succeeded.
const PAGES = [
  [/^\/user-dashboard$/, 'Dashboard', 'The dashboard links to Report a Problem, My Tickets, Technician Requests, Troubleshooting, Load Requests and Account Security. Use the relevant page to view actual records.'],
  [/^\/user\/tickets(?:\/\d+)?$/, 'My Tickets', 'Tap a status card to filter your support tickets, tap it again or All Active to clear the filter, open a ticket to read or reply to support, and select Archived to see older tickets.'],
  [/^\/user\/chat\/\d+$/, 'Ticket Conversation', 'This conversation shows support messages for the selected ticket. Read existing replies and send a message if the ticket is still open. A message does not automatically resolve the ticket.'],
  [/^\/user\/report-problem$/, 'Report a Problem', 'Choose the specific Cignal issue, answer the relevant diagnostic questions, review contact details, and submit a ticket. Only the subscriber can review and submit the form.'],
  [/^\/user\/technician-request$/, 'Request Technician', 'Select the appropriate technician service, provide the issue and contact details, review the request, and submit it in the normal form. The chatbot cannot book or assign technicians.'],
  [/^\/troubleshoot(?:\/.*)?$/, 'Troubleshooting', 'Choose the correct receiver model and symptom. Follow the verified guide for the current issue. Completed steps can be tracked in the troubleshooting session. Escalate unresolved problems to a ticket or technician.'],
  [/^\/user\/load-request$/, 'Load Request', 'Review currently available load plans and request a load using the form. The chatbot must use verified active-plan data for prices and cannot confirm a payment without an actual record.'],
  [/^\/user\/load-history$/, 'Load History', 'Review actual load history and request status. The chatbot cannot invent payment confirmations or change records.'],
  [/^\/user\/retrieve-info$/, 'CCA Inquiry', 'Use the CCA information page to review the available account inquiry steps. Do not share passwords or one-time verification codes in chat.'],
  [/^\/user\/account-security$/, 'Account Security', 'Use this page to manage account security and verified contact methods. Never share your password, recovery code or one-time verification code in chat.'],
  [/^\/user\/terms$/, 'Terms and Privacy', 'Read the currently displayed Terms of Use and Privacy Notice and accept them through the normal page only after reviewing. The chatbot cannot accept on your behalf.'],
];

function getChatbotPageKnowledge(path) {
  const raw = typeof path === 'string' ? path : '';
  if (raw.length > 180 || raw.includes('?') || raw.includes('#')) return null;
  const page = PAGES.find(([pattern]) => pattern.test(raw));
  if (!page) return null;
  return {
    title: page[1],
    guidance: page[2],
    context: `Current CignalCare+ screen: ${page[1]}. Public workflow guidance: ${page[2]} This page hint is NOT authorization, a customer record, or evidence that any action occurred.`,
  };
}

function isPageGuidanceQuestion(message = '') {
  return /what (can|should) i do (here|on this page)|what is this page|how (do i|can i) use this page|how (does|to) (this page|use this page)|paano (gamitin|ko gagamitin) (ito|tong page)|ano (ang|ba ang|pwede|puwede) (gawin|kong gawin) (dito|sa page)|help (me )?(with|on) this page|guide me (on|through) this page/i.test(String(message));
}

module.exports = { getChatbotPageKnowledge, isPageGuidanceQuestion };
