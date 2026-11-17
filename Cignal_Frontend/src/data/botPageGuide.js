// Public UI navigation hints only. No account data, diagnoses or prices here.
const PAGE_GUIDES = [
  { match: /^\/user-dashboard$/, title: 'Dashboard',
    quickReplies: ['What can I do on this page?', 'Check my ticket status', 'No Signal', 'Load/Reload'] },
  { match: /^\/user\/tickets(?:\/\d+)?$/, title: 'My Tickets',
    quickReplies: ['What can I do on this page?', 'Check my ticket status', 'Where are Past Tickets?', 'File a Ticket'] },
  { match: /^\/user\/chat\/\d+$/, title: 'Ticket Conversation',
    quickReplies: ['What can I do on this page?', 'How do I reply to support?', 'Check my ticket status', 'No Signal'] },
  { match: /^\/user\/report-problem$/, title: 'Report a Problem',
    quickReplies: ['What can I do on this page?', 'Help describe my problem', 'No Signal', 'File a Ticket'] },
  { match: /^\/user\/technician-request$/, title: 'Request Technician',
    quickReplies: ['What can I do on this page?', 'Which technician service?', 'Request Technician', 'No Signal'] },
  { match: /^\/troubleshoot(?:\/.*)?$/, title: 'Troubleshooting',
    quickReplies: ['What can I do on this page?', 'What is my next troubleshooting step?', 'Still not working', 'Prepare ticket'] },
  { match: /^\/user\/load-request$/, title: 'Load Request',
    quickReplies: ['What can I do on this page?', 'Available load plans', 'How to request a load?', 'Check my load request'] },
  { match: /^\/user\/load-history$/, title: 'Load History',
    quickReplies: ['What can I do on this page?', 'Check my load request', 'How can I check payment?', 'Load/Reload'] },
  { match: /^\/user\/retrieve-info$/, title: 'CCA Inquiry',
    quickReplies: ['What can I do on this page?', 'How do I find my CCA?', 'No Signal', 'Load/Reload'] },
  { match: /^\/user\/account-security$/, title: 'Account Security',
    quickReplies: ['What can I do on this page?', 'How do I protect my account?', 'How to change my password?', 'File a Ticket'] },
  { match: /^\/user\/terms$/, title: 'Terms and Privacy',
    quickReplies: ['What can I do on this page?', 'What are the Terms of Use?', 'How is my data protected?', 'Account Security'] },
];

export function getBotPageGuide(pathname = '') {
  const page = PAGE_GUIDES.find((item) => item.match.test(String(pathname || '')));
  return page || {
    title: 'CignalCare+',
    quickReplies: ['No Signal', 'Load/Reload', 'File a Ticket', 'Request Technician'],
  };
}
