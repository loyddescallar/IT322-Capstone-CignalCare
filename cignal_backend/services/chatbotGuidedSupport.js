'use strict';

// Deterministic, read-only assistance for CignalCare+.
// This does NOT call external AI, write to the DB, assert issue resolution,
// or treat the client-supplied page/receiver session as authorization.

const ACTIONS = Object.freeze({
  troubleshoot: { label: '🛠 Open Troubleshooting', path: '/troubleshoot', color: 'blue' },
  ticket: { label: '📋 Prepare Ticket Draft', path: '/user/report-problem', color: 'red', draftTarget: 'ticket' },
  technician: { label: '🔧 Request Technician', path: '/user/technician-request', color: 'slate', draftTarget: 'technician' },
  ticketHistory: { label: '🎫 Open My Tickets', path: '/user/tickets', color: 'slate' },
  loadHistory: { label: '📜 View Load History', path: '/user/load-history', color: 'slate' },
  load: { label: '📱 Check Load Plans', path: '/user/load-request', color: 'emerald' },
});

const SUPPORT_TOPIC = /(?:\bsignal\b|\breceiver\b|\bdecoder\b|\bremote\b|\bchannel\b|\bsmart.card\b|\berror\b|\bscreen\b|\bdish\b|\bhdmi\b|\bno picture\b|\bblack screen\b|\bwala(?:ng)? signal\b|\bwalang signal\b|\bwalang picture\b|\bhindi gumagana\b|\bsira\b)/i;
const UNRESOLVED = /(?:\bstill\b|\bnot fixed\b|\bnot working\b|\bunresolved\b|\bdidn.t work\b|\bsame (?:issue|problem)\b|\bhindi pa rin\b|\bdi pa rin\b|\bayaw pa rin\b|\bwala pa rin\b|\bganun pa rin\b|\bwalang pagbabago\b)/i;
const NEXT_STEP = /(?:\bnext (?:troubleshooting )?step\b|\bwhat(?:'s| is) next\b|\bcontinue\b|\bwhat (?:do|should) i do next\b|\bafter this\b|\bsunod\b|\banong susunod\b|\bano(?:ng)? gagawin ko\b|\bwhat now\b)/i;
const PRIVATE_STATUS = /(?:\bstatus\b|\bprogress\b|\bupdate\b|\bkamusta\b|\bano na\b)/i;
const PRIVATE_KIND = /(?:\bticket\b|\btechnician\b|\bload request\b|\bpayment\b)/i;

function getLastUserIssue(context = []) {
  if (!Array.isArray(context)) return '';
  const previous = context.slice(-10).filter(entry => entry && entry.role === 'user');
  // Never echo or transmit these messages elsewhere. Only classify the topic.
  return previous.slice(0, -1).reverse().map(e => String(e.text || '').slice(0, 700))
    .find(text => SUPPORT_TOPIC.test(text)) || '';
}

function isPrivateStatusQuestion(message, context = []) {
  const text = String(message || '');
  if (PRIVATE_STATUS.test(text) && PRIVATE_KIND.test(text)) return true;
  if (!PRIVATE_STATUS.test(text) || !Array.isArray(context)) return false;
  const prior = context.slice(0, -1).slice(-4).filter(x => x?.role === 'user');
  return prior.some(x => PRIVATE_KIND.test(String(x.text || '')));
}

function getGuidedSupportReply({ message = '', context = [], verifiedSession = null } = {}) {
  const text = String(message || '').trim();
  if (!text) return null;

  // Private status needs an authorized, server-verified record. Generic guidance
  // must not accidentally override the authoritative record lookup.
  if (isPrivateStatusQuestion(text, context)) return null;

  if (/(?:password|otp|one.time.code|verification code|recovery code|secret key)/i.test(text) &&
      /(?:send|share|tell|give|type|post)/i.test(text)) {
    return {
      reply: '⚠️ Huwag ibahagi ang iyong password, OTP o recovery code dito. Gamitin ang **Account Security** o ang official recovery form ng CignalCare+.',
      quickReplies: ['How do I protect my account?'], actions: [],
    };
  }

  // These statements are generated from the server-validated model/issue/step map,
  // not from client-provided step descriptions or the model's imagination.
  const active = verifiedSession?.valid && verifiedSession.meta && verifiedSession.text
    ? verifiedSession : null;
  if (active && (NEXT_STEP.test(text) || UNRESOLVED.test(text))) {
    const { meta } = active;
    const remaining = Math.max(0, Number(meta.fullStepCount || 0) - Number(meta.completedStepCount || 0));
    const done = remaining === 0 && Number(meta.fullStepCount || 0) > 0;
    if (done && UNRESOLVED.test(text)) {
      return {
        reply: `Na-mark nang complete ang lahat ng ${meta.fullStepCount} verified troubleshooting steps para sa **${meta.modelName}** (${meta.issueTitle}), pero hindi pa rin resolved ang concern. Maaari kang maghanda ng support ticket o technician request. Walang automatic na submission.`,
        quickReplies: ['Prepare ticket', 'Request Technician'],
        actions: [ACTIONS.ticket, ACTIONS.technician],
      };
    }
    const currentLine = active.text.split('\n').find(line => line.startsWith('Current displayed step:')) || '';
    const currentDone = Array.isArray(verifiedSession.completedStepIds)
      ? verifiedSession.completedStepIds.includes(meta.currentStepId) : false;
    // A step can be shown as completed in the session; do not tell them to repeat it.
    if (currentDone || currentLine.includes('Not available')) {
      return {
        reply: `Nasa **${meta.modelName} — ${meta.issueTitle}** troubleshooting session ka. May **${remaining}** verified full-guide step(s) pang hindi na-mark complete. Buksan ang guide at gamitin ang **Next** para makita ang kasunod na step. Hindi ko huhulaan o uulitin ang natapos mo na.`,
        quickReplies: ['What is my next troubleshooting step?', 'Prepare ticket'],
        actions: [ACTIONS.troubleshoot, ACTIONS.ticket],
      };
    }
    return {
      reply: `Ayon sa verified **${meta.modelName}** session mo:\n\n**${currentLine}**\n\n${remaining} full-guide step(s) ang hindi pa marked complete. Sundin ang instruction sa Troubleshooting page, at markahan lamang ito kapag natapos mo na. Kung unresolved pa rin, puwede kang maghanda ng support ticket.`,
      quickReplies: ['Still not working', 'Prepare ticket'],
      actions: [ACTIONS.ticket],
    };
  }

  const unresolved = UNRESOLVED.test(text);
  const currentProblem = SUPPORT_TOPIC.test(text);
  const previousProblem = Boolean(getLastUserIssue(context));
  if (unresolved && (currentProblem || previousProblem)) {
    return {
      reply: 'Naiintindihan ko na **hindi pa rin maayos** ang concern. Para hindi tayo mag-ulit ng hindi kailangang steps, buksan ang Troubleshooting at piliin ang tamang receiver model at issue. Kung natapos mo na ang verified guide at unresolved pa rin, maaari kitang tulungang maghanda ng **ticket draft** o technician request. Ikaw pa rin ang magre-review at magsusubmit.',
      quickReplies: ['Prepare ticket', 'Request Technician'],
      actions: [ACTIONS.troubleshoot, ACTIONS.ticket, ACTIONS.technician],
    };
  }

  if (/(?:past tickets?|ticket history|historical tickets?|archived tickets?|old tickets?)/i.test(text)) {
    return {
      reply: 'Sa **My Tickets**, i-expand ang **Past Tickets** para makita ang dating Resolved o Archived na tickets at kanilang mga conversation. Hindi dinidelete ang history kapag na-archive.',
      quickReplies: ['Check my ticket status', 'File a Ticket'],
      actions: [ACTIONS.ticketHistory],
    };
  }

  if (/(?:which|what|choose|identify|find).{0,25}(?:receiver|box) model|receiver model.{0,15}(?:choose|find)|anong (?:receiver|box|model)/i.test(text)) {
    return {
      reply: 'Tingnan ang **model name sa label ng Cignal receiver** o sa nakalagay sa device. Piliin lamang ang kaparehong model sa Troubleshooting page. Kung hindi sigurado, huwag hulaan ang mga menu instructions para sa ibang receiver.',
      quickReplies: ['Open Troubleshooting', 'No Signal'],
      actions: [ACTIONS.troubleshoot],
    };
  }

  if (currentProblem && /(?:\bno.signal\b|\bwalang signal\b|\berror\b|\bblack screen\b|\bno picture\b)/i.test(text)) {
    return {
      reply: 'Tutulungan kita sa Cignal receiver concern mo. 📺 **Anong receiver model ang gamit mo, at ano ang exact error o sintomas?** Mahalaga iyon para hindi tayo magbigay ng steps para sa ibang model. Maaari ring buksan ang verified Troubleshooting guide.',
      quickReplies: ['What receiver model should I choose?', 'Open Troubleshooting', 'Prepare ticket'],
      actions: [ACTIONS.troubleshoot, ACTIONS.ticket],
    };
  }

  if (NEXT_STEP.test(text) && previousProblem) {
    return {
      reply: 'Para maituro ko ang **tamang next step**, piliin muna ang receiver model at issue sa Troubleshooting page. Kapag nakabukas ang active guide, magagamit natin ang verified current-step information; hindi natin kailangang manghula ng instructions.',
      quickReplies: ['Open Troubleshooting', 'Prepare ticket'],
      actions: [ACTIONS.troubleshoot, ACTIONS.ticket],
    };
  }

  return null;
}

function buildVerifiedPersonalStatusReply({ message = '', context = [], personalSupport = null, requestedIds = {} } = {}) {
  if (!personalSupport || !isPrivateStatusQuestion(message, context)) return null;
  const text = String(message || '').toLowerCase();
  const previous = Array.isArray(context) ? context.slice(0, -1).slice(-4).map(x => String(x?.text || '')).join(' ').toLowerCase() : '';
  const mention = text + ' ' + previous;
  const kind = /(?:technician|tech request)/i.test(text) ? 'technician'
    : /(?:load request|payment|reload)/i.test(text) ? 'load'
      : /ticket/i.test(text) ? 'ticket'
        : /(?:technician|tech request)/i.test(mention) ? 'technician'
          : /(?:load request|payment|reload)/i.test(mention) ? 'load' : 'ticket';
  const table = {
    ticket: { latest: 'latestTicket', key: 'ticket', label: 'support ticket', path: 'My Tickets' },
    technician: { latest: 'latestTechnicianRequest', key: 'technician', label: 'technician request', path: 'Request Technician' },
    load: { latest: 'latestLoadRequest', key: 'load', label: 'load request', path: 'Load History' },
  }[kind];
  const exactId = requestedIds?.[table.key];
  const requested = personalSupport.requested?.[table.key];
  // A specifically requested record that does not belong to this account must
  // be reported as not found. Never silently substitute the latest record.
  const record = exactId ? (requested?.record || null) : personalSupport[table.latest];
  if (!record) return `Walang verified ${exactId ? `${table.label} #${exactId}` : table.label} na available para sa account mo. Tingnan ang **${table.path}** para sa aktuwal na records.`;
  const status = String(record.status || '').slice(0, 80) || 'Not available';
  const payment = kind === 'load' ? `\nPayment status: **${String(record.payment_status || 'Not available').slice(0, 80)}**` : '';
  return `**Verified ${table.label} #${record.id}**\nCurrent status: **${status}**${payment}\n\nIto ang naka-record sa CignalCare+ para sa account mo. Para sa detalye at latest conversation, buksan ang **${table.path}**.`;
}

module.exports = { getGuidedSupportReply, buildVerifiedPersonalStatusReply, isPrivateStatusQuestion, ACTIONS };
