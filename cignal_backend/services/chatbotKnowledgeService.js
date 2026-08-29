const pool = require('../config/db');
const { boxModels } = require('../data/troubleshootData');
const { getTicketsByUser, getTicketById } = require('../models/ticketModel');
const { getRequestsByUser, getRequestById } = require('../models/technicianModel');
const { getLoadRequestsByUser, getLoadRequestById } = require('../models/loadRequestModel');

function safeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizeChannel(channel) {
  if (typeof channel === 'string') {
    return { name: channel.trim(), category: 'Others' };
  }

  return {
    name: String(channel?.name || '').trim(),
    category: String(channel?.category || 'Others').trim() || 'Others',
  };
}

function formatDateTime(value) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getConversationSearchText(message = '', context = []) {
  const recentUserText = Array.isArray(context)
    ? context
        .slice(-6)
        .filter((item) => item?.role !== 'assistant')
        .map((item) => String(item?.text || '').trim())
        .filter(Boolean)
        .join(' ')
    : '';

  return `${recentUserText} ${String(message || '')}`.toLowerCase().trim();
}

function getKnowledgeNeeds(message = '', context = []) {
  const text = getConversationSearchText(message, context);

  const hasErrorCode = /\be-?\d+\b|\berror\s*\d+\b/i.test(text);

  return {
    loadPlans: /(load|reload|prepaid|plan|package|payment|paymongo|channel lineup|channels included|validity|price|magkano)/i.test(text),
    troubleshooting: hasErrorCode || /(signal|screen|remote|receiver|box|decoder|channel|record|dvr|picture|display|technical|troubleshoot|problema|sira|gumagana|working|error|smart card|audio|sound|power|hdmi|av)/i.test(text),
    incidents: /(incident|common issue|outage|area|location|same issue|marami|lahat|everyone|no signal|walang signal|signal problem)/i.test(text),
  };
}

function extractRequestedRecordIds(message = '', context = []) {
  const text = getConversationSearchText(message, context);

  const patterns = {
    ticket: /(?:support\s+)?ticket\s*(?:#|no\.?|number)?\s*(\d+)/i,
    technician: /(?:technician(?:\s+request)?|tech\s+request)\s*(?:#|no\.?|number)?\s*(\d+)/i,
    load: /(?:load\s+request|reload\s+request|payment\s+request)\s*(?:#|no\.?|number)?\s*(\d+)/i,
  };

  const ids = {};

  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match?.[1]) ids[key] = Number(match[1]);
  }

  return ids;
}

async function getActiveLoadPlans() {
  const [rows] = await pool.query(`
    SELECT
      id,
      plan_code,
      plan_name,
      amount,
      validity_days,
      hd_channels,
      sd_channels,
      benefits_text,
      channels_json,
      ai_note
    FROM prepaid_plans
    WHERE status = 'active'
    ORDER BY amount ASC, id ASC
  `);

  return rows.map((plan) => {
    const channels = safeJsonArray(plan.channels_json)
      .map(normalizeChannel)
      .filter((channel) => channel.name);

    return {
      id: plan.id,
      code: plan.plan_code,
      name: plan.plan_name,
      amount: Number(plan.amount || 0),
      validityDays: Number(plan.validity_days || 0),
      hdChannels: Number(plan.hd_channels || 0),
      sdChannels: Number(plan.sd_channels || 0),
      benefits: String(plan.benefits_text || '').trim(),
      aiNote: String(plan.ai_note || '').trim(),
      channelCount: channels.length,
      channels,
    };
  });
}

function buildAllTroubleshootingKnowledge() {
  const entries = [];

  for (const model of boxModels) {
    for (const issue of model.issues || []) {
      let stepNumber = 0;
      const steps = [];

      for (const section of issue.sections || []) {
        for (const instruction of section.steps || []) {
          stepNumber += 1;
          steps.push({
            stepNumber,
            sectionTitle: section.title,
            instruction: String(instruction).trim(),
          });
        }
      }

      entries.push({
        issueId: issue.id,
        modelId: model.id,
        modelName: model.name,
        title: issue.shortTitle,
        description: issue.description,
        category: issue.category,
        errorCode: /^E\d/i.test(String(issue.shortTitle || ''))
          ? issue.shortTitle
          : null,
        keywords: Array.isArray(issue.keywords) ? issue.keywords : [],
        relatedComponents: Array.isArray(issue.relatedComponents)
          ? issue.relatedComponents
          : [],
        note: issue.note || '',
        sourceUrl: model.sourceUrl || '',
        steps,
      });
    }
  }

  return entries;
}

function scoreTroubleshootingIssue(issue, queryText) {
  const text = String(queryText || '').toLowerCase();
  if (!text) return 0;

  let score = 0;
  const title = String(issue.title || '').toLowerCase();
  const description = String(issue.description || '').toLowerCase();
  const category = String(issue.category || '').toLowerCase();
  const modelName = String(issue.modelName || '').toLowerCase();
  const modelId = String(issue.modelId || '').replace(/-/g, ' ').toLowerCase();

  if (issue.errorCode && text.includes(String(issue.errorCode).toLowerCase())) score += 20;
  if (title && text.includes(title)) score += 12;
  if (category && text.includes(category)) score += 2;

  if (modelName && text.includes(modelName)) score += 30;
  if (modelId && text.includes(modelId)) score += 20;

  const modelTerms = modelName
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 4 && !['cignal', 'receiver'].includes(term));
  for (const term of modelTerms) {
    if (text.includes(term)) score += 8;
  }

  for (const keyword of issue.keywords || []) {
    const normalized = String(keyword || '').toLowerCase().trim();
    if (normalized && text.includes(normalized)) {
      score += normalized.includes(' ') ? 8 : 4;
    }
  }

  const usefulTerms = text
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 4);

  for (const term of usefulTerms) {
    if (title.includes(term)) score += 2;
    if (description.includes(term)) score += 1;
  }

  return score;
}

async function getTroubleshootingKnowledge(queryText = '') {
  const allIssues = buildAllTroubleshootingKnowledge();
  const cleanQuery = String(queryText || '').trim();

  if (!cleanQuery) return allIssues;

  const ranked = allIssues
    .map((issue) => ({ issue, score: scoreTroubleshootingIssue(issue, cleanQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score || 0;
  const strongModelMatch = ranked.some(
    (entry) => entry.score >= topScore && entry.score >= 28
  );

  return ranked
    .slice(0, strongModelMatch ? 3 : 6)
    .map((entry) => entry.issue);
}

async function getLatestPersonalSupportRecords(userId) {
  if (!userId) {
    return {
      latestTicket: null,
      latestTechnicianRequest: null,
      latestLoadRequest: null,
      requested: {},
    };
  }

  const [tickets, technicianRequests, loadRequests] = await Promise.all([
    getTicketsByUser(userId),
    getRequestsByUser(userId),
    getLoadRequestsByUser(userId),
  ]);

  return {
    latestTicket: tickets[0] || null,
    latestTechnicianRequest: technicianRequests[0] || null,
    latestLoadRequest: loadRequests[0] || null,
    requested: {},
  };
}

async function getPersonalSupportRecords(userId, requestedIds = {}) {
  const support = await getLatestPersonalSupportRecords(userId);
  const requested = {};

  if (requestedIds.ticket) {
    const record = await getTicketById(requestedIds.ticket);
    requested.ticket = {
      id: requestedIds.ticket,
      record: record && String(record.user_id) === String(userId) ? record : null,
    };
  }

  if (requestedIds.technician) {
    const record = await getRequestById(requestedIds.technician);
    requested.technician = {
      id: requestedIds.technician,
      record: record && String(record.user_id) === String(userId) ? record : null,
    };
  }

  if (requestedIds.load) {
    const record = await getLoadRequestById(requestedIds.load);
    requested.load = {
      id: requestedIds.load,
      record: record && String(record.user_id) === String(userId) ? record : null,
    };
  }

  return { ...support, requested };
}

function formatTicketRecord(ticket, label = 'Latest ticket') {
  if (!ticket) return `${label}: No matching ticket record found for this customer.`;

  return [
    `${label}: #${ticket.id}`,
    `status: ${ticket.status || 'Not available'}`,
    ticket.category ? `category: ${ticket.category}` : '',
    ticket.subject ? `subject: ${ticket.subject}` : '',
    `submitted: ${formatDateTime(ticket.created_at)}`,
    ticket.updated_at ? `last updated: ${formatDateTime(ticket.updated_at)}` : '',
  ].filter(Boolean).join(' | ');
}

function formatTechnicianRecord(request, label = 'Latest technician request') {
  if (!request) return `${label}: No matching technician request record found for this customer.`;

  return [
    `${label}: #${request.id}`,
    `status: ${request.status || 'Not available'}`,
    request.technician_name
      ? `assigned technician: ${request.technician_name}`
      : 'assigned technician: Not assigned yet',
    request.preferred_date
      ? `preferred date: ${String(request.preferred_date).slice(0, 10)}`
      : '',
    request.preferred_time ? `preferred time: ${request.preferred_time}` : '',
    `submitted: ${formatDateTime(request.created_at)}`,
    request.updated_at ? `last updated: ${formatDateTime(request.updated_at)}` : '',
  ].filter(Boolean).join(' | ');
}

function formatLoadRecord(request, label = 'Latest load request') {
  if (!request) return `${label}: No matching load request record found for this customer.`;

  return [
    `${label}: #${request.id}`,
    `request status: ${request.status || 'Not available'}`,
    `payment status: ${request.payment_status || 'Not available'}`,
    request.plan_name ? `plan: ${request.plan_name}` : '',
    request.amount != null
      ? `amount: PHP ${Number(request.amount || 0).toLocaleString('en-PH')}`
      : '',
    request.payment_method ? `payment method: ${request.payment_method}` : '',
    `submitted: ${formatDateTime(request.created_at)}`,
    request.updated_at ? `last updated: ${formatDateTime(request.updated_at)}` : '',
  ].filter(Boolean).join(' | ');
}

function buildPlanKnowledgeText(plans = []) {
  if (!plans.length) return '';

  const planLines = plans.map((plan) => {
    const details = [
      `${plan.name} (code: ${plan.code || 'N/A'})`,
      `price: PHP ${plan.amount.toLocaleString('en-PH')}`,
      `validity: ${plan.validityDays || 'N/A'} days`,
      `HD channels: ${plan.hdChannels}`,
      `SD channels: ${plan.sdChannels}`,
    ];

    if (plan.benefits) details.push(`benefits: ${plan.benefits}`);
    if (plan.aiNote) details.push(`note: ${plan.aiNote}`);

    if (plan.channels.length) {
      const channelNames = plan.channels
        .slice(0, 40)
        .map((channel) => `${channel.name}${channel.category ? ` (${channel.category})` : ''}`)
        .join(', ');

      details.push(
        `configured channels (${plan.channelCount}): ${channelNames}${plan.channelCount > 40 ? ', ...' : ''}`
      );
    } else {
      details.push('configured channel list: not provided');
    }

    return `- ${details.join(' | ')}`;
  });

  return [
    'CURRENT ACTIVE PREPAID LOAD PLANS (database source of truth):',
    ...planLines,
  ].join('\n');
}

function buildTroubleshootingKnowledgeText(troubleshooting = [], { catalogOnly = false } = {}) {
  if (!troubleshooting.length) return '';

  if (catalogOnly) {
    return [
      'AVAILABLE VERIFIED TROUBLESHOOTING TOPICS (ask the customer to identify the box model and issue before giving model-specific menu steps):',
      ...troubleshooting.map(
        (issue) => `- ${issue.modelName}: ${issue.title} | category: ${issue.category}`
      ),
    ].join('\n');
  }

  const variantsByIssue = troubleshooting.reduce((map, issue) => {
    const key = String(issue.issueId || issue.title || 'issue');
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(issue.modelName);
    return map;
  }, new Map());

  const hasMultipleModelVariants = Array.from(variantsByIssue.values()).some(
    (models) => models.size > 1
  );

  const troubleshootingLines = troubleshooting.map((issue) => {
    const steps = issue.steps.length
      ? issue.steps
          .map((step) => {
            const section = step.sectionTitle ? `[${step.sectionTitle}] ` : '';
            return `${step.stepNumber}. ${section}${step.instruction}`;
          })
          .join(' ')
      : 'No troubleshooting steps are currently configured.';

    return [
      `- Box model: ${issue.modelName}`,
      `Issue: ${issue.title}`,
      issue.errorCode ? `Error code: ${issue.errorCode}` : '',
      issue.description ? `Description: ${issue.description}` : '',
      issue.relatedComponents?.length
        ? `Relevant external parts: ${issue.relatedComponents.join(', ')}`
        : '',
      issue.note ? `Important note: ${issue.note}` : '',
      `Verified model-specific steps: ${steps}`,
    ].filter(Boolean).join(' | ');
  });

  return [
    'RELEVANT VERIFIED TROUBLESHOOTING KNOWLEDGE (backend source of truth):',
    ...(hasMultipleModelVariants
      ? ['IMPORTANT: Multiple receiver variants are listed. If the customer has not identified their box model, ask which box they use before giving menu-specific reset or signal-test instructions. Do not combine procedures from different models.']
      : []),
    ...troubleshootingLines,
  ].join('\n');
}

function buildPersonalSupportText({
  latestTicket,
  latestTechnicianRequest,
  latestLoadRequest,
  requested = {},
} = {}) {
  const lines = [
    'AUTHENTICATED CUSTOMER PERSONAL SUPPORT DATA (read-only; current logged-in user only):',
  ];

  if (requested.ticket) {
    lines.push(formatTicketRecord(
      requested.ticket.record,
      `Requested ticket #${requested.ticket.id}`
    ));
  } else {
    lines.push(formatTicketRecord(latestTicket));
  }

  if (requested.technician) {
    lines.push(formatTechnicianRecord(
      requested.technician.record,
      `Requested technician request #${requested.technician.id}`
    ));
  } else {
    lines.push(formatTechnicianRecord(latestTechnicianRequest));
  }

  if (requested.load) {
    lines.push(formatLoadRecord(
      requested.load.record,
      `Requested load request #${requested.load.id}`
    ));
  } else {
    lines.push(formatLoadRecord(latestLoadRequest));
  }

  if (Object.keys(requested).length) {
    lines.push(
      'When a specific record number is requested above, answer from that requested record rather than substituting the latest record.'
    );
  }

  return lines.join('\n');
}

async function getConfirmedIncidentsForUser(userId) {
  if (!userId) return [];

  const [rows] = await pool.query(`
    SELECT si.id, si.issue_label, si.location, si.confirmed_at, si.notes
    FROM support_incidents si
    JOIN users u ON u.location = si.location
    WHERE u.id = ? AND si.status = 'confirmed'
    ORDER BY si.confirmed_at DESC, si.created_at DESC
    LIMIT 5
  `, [userId]);

  return rows;
}

function buildIncidentKnowledgeText(incidents = []) {
  if (!incidents.length) return '';

  return [
    'ADMIN-CONFIRMED SERVICE INCIDENTS FOR THIS CUSTOMER LOCATION:',
    ...incidents.map((incident) =>
      `- ${incident.issue_label} in ${incident.location}${incident.notes ? ` | Admin note: ${incident.notes}` : ''}`
    ),
    'These incidents were confirmed by an administrator. Explain them as advisories, but still allow the customer to report an individual issue if their situation differs.',
  ].join('\n');
}

async function safeKnowledgeLookup(label, lookup, fallbackValue) {
  try {
    return { ok: true, value: await lookup(), error: null };
  } catch (error) {
    console.error(`CHATBOT ${label} LOOKUP ERROR:`, error?.message || error);
    return { ok: false, value: fallbackValue, error };
  }
}

function buildAvailabilityText({
  plansRequested,
  plansAvailable,
  personalDataAvailable,
  personalRequested,
  incidentsRequested,
  incidentsAvailable,
}) {
  const lines = [];

  if (plansRequested && !plansAvailable) {
    lines.push(
      '- Live prepaid plan data is temporarily unavailable. Do not invent plan names, prices, channels, or availability.'
    );
  }

  if (personalRequested && !personalDataAvailable) {
    lines.push(
      '- Authenticated personal support records are temporarily unavailable. Do not guess ticket, technician-request, load-request, or payment statuses; explain that live status cannot be checked right now.'
    );
  }

  if (incidentsRequested && !incidentsAvailable) {
    lines.push(
      '- Confirmed incident data for the customer location is temporarily unavailable. Do not claim that there is or is not a confirmed service incident.'
    );
  }

  if (!lines.length) return '';

  return ['SYSTEM DATA AVAILABILITY NOTICE:', ...lines].join('\n');
}

async function getChatbotKnowledge({
  userId = null,
  includePersonalData = false,
  message = '',
  context = [],
} = {}) {
  const needs = getKnowledgeNeeds(message, context);
  const searchText = getConversationSearchText(message, context);
  const requestedIds = extractRequestedRecordIds(message, context);

  const allTroubleshooting = needs.troubleshooting
    ? buildAllTroubleshootingKnowledge()
    : [];
  const relevantTroubleshooting = needs.troubleshooting
    ? await getTroubleshootingKnowledge(searchText)
    : [];
  const catalogOnly = needs.troubleshooting && relevantTroubleshooting.length === 0;
  const troubleshooting = catalogOnly
    ? allTroubleshooting
    : relevantTroubleshooting;

  const [plansResult, personalResult, incidentResult] = await Promise.all([
    needs.loadPlans
      ? safeKnowledgeLookup('LOAD PLAN', getActiveLoadPlans, [])
      : Promise.resolve({ ok: true, value: [], error: null }),
    includePersonalData
      ? safeKnowledgeLookup(
          'PERSONAL SUPPORT',
          () => getPersonalSupportRecords(userId, requestedIds),
          null
        )
      : Promise.resolve({ ok: true, value: null, error: null }),
    userId && needs.incidents
      ? safeKnowledgeLookup('CONFIRMED INCIDENT', () => getConfirmedIncidentsForUser(userId), [])
      : Promise.resolve({ ok: true, value: [], error: null }),
  ]);

  const plans = plansResult.value || [];
  const personalSupport = personalResult.value;
  const confirmedIncidents = incidentResult.value || [];
  const sections = [];

  const planText = buildPlanKnowledgeText(plans);
  if (planText) sections.push(planText);

  const troubleshootingText = buildTroubleshootingKnowledgeText(
    troubleshooting,
    { catalogOnly }
  );
  if (troubleshootingText) sections.push(troubleshootingText);

  if (personalSupport) {
    sections.push(buildPersonalSupportText(personalSupport));
  }

  const incidentText = buildIncidentKnowledgeText(confirmedIncidents);
  if (incidentText) sections.push(incidentText);

  const availabilityText = buildAvailabilityText({
    plansRequested: needs.loadPlans,
    plansAvailable: plansResult.ok,
    personalDataAvailable: personalResult.ok,
    personalRequested: includePersonalData,
    incidentsRequested: Boolean(userId && needs.incidents),
    incidentsAvailable: incidentResult.ok,
  });
  if (availabilityText) sections.push(availabilityText);

  return {
    plans,
    troubleshooting,
    personalSupport,
    confirmedIncidents,
    requestedIds,
    needs,
    availability: {
      plans: needs.loadPlans ? plansResult.ok : null,
      troubleshooting: needs.troubleshooting ? true : null,
      personalSupport: includePersonalData ? personalResult.ok : null,
      incidents: userId && needs.incidents ? incidentResult.ok : null,
    },
    text: sections.filter(Boolean).join('\n\n'),
  };
}

function buildChatbotUiHints(message = '', context = []) {
  const normalized = getConversationSearchText(message, context);
  const actions = [];
  const quickReplies = [];

  const modelMatchers = [
    { id: 'samsung-pvr-hd', label: 'Samsung PVR', test: /samsung\s+pvr/i },
    { id: 'samsung-hd', label: 'Samsung HD', test: /samsung(?!\s+pvr).*\bhd\b|\bsamsung\b/i },
    { id: 'changhong-silver-hd', label: 'Changhong Silver HD', test: /changhong.*silver/i },
    { id: 'changhong-black-hd', label: 'Changhong Black HD', test: /changhong.*black/i },
    { id: 'arion-hd-zapper', label: 'Arion HD Cardless Zapper', test: /arion|cardless\s+zapper/i },
    { id: 'pace-hd', label: 'Pace HD', test: /\bpace\b/i },
    { id: 'humax-hd', label: 'Humax HD', test: /\bhumax\b/i },
    { id: 'giec-hd', label: 'GIEC HD', test: /\bgiec\b/i },
  ];

  const matchedModel = modelMatchers.find((model) => model.test.test(normalized));
  let focusedComponent = '';
  if (/(smart card|e1|e2|e11)/i.test(normalized)) focusedComponent = 'smart-card-slot';
  else if (/(no signal|signal input|technical problem|lnb|coax)/i.test(normalized)) focusedComponent = 'lnb-in';
  else if (/(hdmi|rca|av|black screen|blue screen|no picture|video|audio|sound)/i.test(normalized)) focusedComponent = 'hdmi-av-out';
  else if (/(power|not turning on|not powering|adapter|outlet)/i.test(normalized)) focusedComponent = 'power-input';

  if (
    focusedComponent === 'smart-card-slot' &&
    matchedModel &&
    !['pace-hd', 'humax-hd', 'samsung-pvr-hd', 'samsung-hd'].includes(matchedModel.id)
  ) {
    focusedComponent = 'power-input';
  }

  const loadIntent = /(load|reload|prepaid|plan|package|payment|paymongo|channel lineup|available load)/i.test(normalized);
  const troubleshootIntent = /(signal|screen|remote|receiver|box|decoder|channel|record|dvr|picture|display|technical|troubleshoot|problema|sira|gumagana|working|error|smart card|audio|sound|power)/i.test(normalized);
  const unresolvedIntent = /(still not|not fixed|unresolved|hindi pa rin|ayaw pa rin|di pa rin|same problem|same issue|wala pa rin)/i.test(normalized);
  const ticketStatusIntent = /(ticket).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(ticket)/i.test(normalized);
  const technicianStatusIntent = /(technician|tech request).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(technician|tech request)/i.test(normalized);
  const loadStatusIntent = /(load request|payment).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(load request|payment)/i.test(normalized);

  if (ticketStatusIntent) {
    actions.push({ label: '🎫 My Tickets', path: '/user/tickets', color: 'slate' });
  }

  if (technicianStatusIntent) {
    actions.push({ label: '🔧 Technician Requests', path: '/user/technician-request', color: 'slate' });
  }

  if (loadStatusIntent) {
    actions.push({ label: '📜 View Load History', path: '/user/load-history', color: 'slate' });
  }

  if (loadIntent) {
    actions.push(
      { label: '📱 Open Load Request', path: '/user/load-request', color: 'emerald' },
      { label: '📜 View Load History', path: '/user/load-history', color: 'slate' }
    );
  }

  if (troubleshootIntent) {
    if (!unresolvedIntent) {
      if (matchedModel) {
        const query = focusedComponent
          ? `?component=${encodeURIComponent(focusedComponent)}`
          : '';
        actions.push({
          label: `🧭 Show ${matchedModel.label} Guide`,
          path: `/troubleshoot/${matchedModel.id}${query}`,
          color: 'blue',
        });
      } else {
        actions.push({ label: '🛠 Open Troubleshooting', path: '/troubleshoot', color: 'blue' });
      }
    }

    actions.push(
      {
        label: unresolvedIntent ? '📋 Prepare Ticket Draft' : '📋 File a Ticket',
        path: '/user/report-problem',
        color: 'red',
        draftTarget: 'ticket',
      },
      {
        label: unresolvedIntent ? '🔧 Prepare Technician Draft' : '🔧 Request Technician',
        path: '/user/technician-request',
        color: 'slate',
        draftTarget: 'technician',
      }
    );

    quickReplies.push('No Signal', 'Remote not working');
    if (!unresolvedIntent) quickReplies.push('Still not working');
  }

  const uniqueActions = actions.filter(
    (action, index, list) =>
      list.findIndex((item) => item.path === action.path) === index
  );

  return {
    actions: uniqueActions.slice(0, 3),
    quickReplies: [...new Set(quickReplies)].slice(0, 4),
  };
}

module.exports = {
  getActiveLoadPlans,
  getTroubleshootingKnowledge,
  getLatestPersonalSupportRecords,
  getPersonalSupportRecords,
  getConfirmedIncidentsForUser,
  getKnowledgeNeeds,
  extractRequestedRecordIds,
  getChatbotKnowledge,
  buildChatbotUiHints,
};
