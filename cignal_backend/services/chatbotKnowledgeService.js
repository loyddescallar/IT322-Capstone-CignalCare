const pool = require('../config/db');
const { boxModels } = require('../data/troubleshootData');
const { getTicketsByUser } = require('../models/ticketModel');
const { getRequestsByUser } = require('../models/technicianModel');
const { getLoadRequestsByUser } = require('../models/loadRequestModel');

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

async function getTroubleshootingKnowledge() {
  const issueMap = new Map();

  for (const model of boxModels) {
    for (const issue of model.issues || []) {
      const key = String(issue.id);

      if (!issueMap.has(key)) {
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

        issueMap.set(key, {
          issueId: issue.id,
          title: issue.shortTitle,
          description: issue.description,
          category: issue.category,
          errorCode: /^E\d/i.test(String(issue.shortTitle || ''))
            ? issue.shortTitle
            : null,
          keywords: Array.isArray(issue.keywords) ? issue.keywords : [],
          note: issue.note || '',
          applicableModels: [],
          steps,
        });
      }

      issueMap.get(key).applicableModels.push(model.name);
    }
  }

  return Array.from(issueMap.values());
}

async function getLatestPersonalSupportRecords(userId) {
  if (!userId) {
    return {
      latestTicket: null,
      latestTechnicianRequest: null,
      latestLoadRequest: null,
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
  };
}

function buildKnowledgeText({ plans = [], troubleshooting = [] }) {
  const sections = [];

  if (plans.length) {
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

    sections.push(
      [
        'CURRENT ACTIVE PREPAID LOAD PLANS (database source of truth):',
        ...planLines,
      ].join('\n')
    );
  }

  if (troubleshooting.length) {
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
        `- Issue: ${issue.title}`,
        issue.errorCode ? `Error code: ${issue.errorCode}` : '',
        issue.description ? `Description: ${issue.description}` : '',
        issue.applicableModels?.length
          ? `Applicable box models: ${issue.applicableModels.join(', ')}`
          : '',
        issue.note ? `Important note: ${issue.note}` : '',
        `Verified steps: ${steps}`,
      ]
        .filter(Boolean)
        .join(' | ');
    });

    sections.push(
      [
        'CURRENT VERIFIED TROUBLESHOOTING KNOWLEDGE (backend source of truth):',
        ...troubleshootingLines,
      ].join('\n')
    );
  }

  return sections.join('\n\n');
}

function buildPersonalSupportText({
  latestTicket,
  latestTechnicianRequest,
  latestLoadRequest,
} = {}) {
  const lines = [
    'AUTHENTICATED CUSTOMER PERSONAL SUPPORT DATA (read-only; current logged-in user only):',
  ];

  if (latestTicket) {
    lines.push(
      [
        `Latest ticket: #${latestTicket.id}`,
        `status: ${latestTicket.status || 'Not available'}`,
        latestTicket.category ? `category: ${latestTicket.category}` : '',
        latestTicket.subject ? `subject: ${latestTicket.subject}` : '',
        `submitted: ${formatDateTime(latestTicket.created_at)}`,
        latestTicket.updated_at
          ? `last updated: ${formatDateTime(latestTicket.updated_at)}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ')
    );
  } else {
    lines.push('Latest ticket: No ticket record found for this customer.');
  }

  if (latestTechnicianRequest) {
    lines.push(
      [
        `Latest technician request: #${latestTechnicianRequest.id}`,
        `status: ${latestTechnicianRequest.status || 'Not available'}`,
        latestTechnicianRequest.technician_name
          ? `assigned technician: ${latestTechnicianRequest.technician_name}`
          : 'assigned technician: Not assigned yet',
        latestTechnicianRequest.preferred_date
          ? `preferred date: ${String(latestTechnicianRequest.preferred_date).slice(0, 10)}`
          : '',
        latestTechnicianRequest.preferred_time
          ? `preferred time: ${latestTechnicianRequest.preferred_time}`
          : '',
        `submitted: ${formatDateTime(latestTechnicianRequest.created_at)}`,
        latestTechnicianRequest.updated_at
          ? `last updated: ${formatDateTime(latestTechnicianRequest.updated_at)}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ')
    );
  } else {
    lines.push('Latest technician request: No technician request record found for this customer.');
  }

  if (latestLoadRequest) {
    lines.push(
      [
        `Latest load request: #${latestLoadRequest.id}`,
        `request status: ${latestLoadRequest.status || 'Not available'}`,
        `payment status: ${latestLoadRequest.payment_status || 'Not available'}`,
        latestLoadRequest.plan_name ? `plan: ${latestLoadRequest.plan_name}` : '',
        latestLoadRequest.amount != null
          ? `amount: PHP ${Number(latestLoadRequest.amount || 0).toLocaleString('en-PH')}`
          : '',
        latestLoadRequest.payment_method
          ? `payment method: ${latestLoadRequest.payment_method}`
          : '',
        `submitted: ${formatDateTime(latestLoadRequest.created_at)}`,
        latestLoadRequest.updated_at
          ? `last updated: ${formatDateTime(latestLoadRequest.updated_at)}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ')
    );
  } else {
    lines.push('Latest load request: No load request record found for this customer.');
  }

  return lines.join('\n');
}

async function getChatbotKnowledge({ userId = null, includePersonalData = false } = {}) {
  const [plans, troubleshooting, personalSupport] = await Promise.all([
    getActiveLoadPlans(),
    getTroubleshootingKnowledge(),
    includePersonalData
      ? getLatestPersonalSupportRecords(userId)
      : Promise.resolve(null),
  ]);

  const sections = [buildKnowledgeText({ plans, troubleshooting })];

  if (personalSupport) {
    sections.push(buildPersonalSupportText(personalSupport));
  }

  return {
    plans,
    troubleshooting,
    personalSupport,
    text: sections.filter(Boolean).join('\n\n'),
  };
}

function buildChatbotUiHints(message = '') {
  const normalized = String(message).toLowerCase();
  const actions = [];
  const quickReplies = [];

  const loadIntent = /(load|reload|prepaid|plan|package|payment|paymongo|channel lineup|available load)/i.test(normalized);
  const troubleshootIntent = /(signal|screen|remote|receiver|box|channel|record|dvr|hd|picture|display|technical|troubleshoot|problema|sira|gumagana|working|error)/i.test(normalized);
  const ticketStatusIntent = /(ticket).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(ticket)/i.test(normalized);
  const technicianStatusIntent = /(technician|tech request).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(technician|tech request)/i.test(normalized);
  const loadStatusIntent = /(load request|payment).*(status|latest|update|progress|ko|my)|(status|latest|update|progress).*(load request|payment)/i.test(normalized);

  if (loadIntent) {
    actions.push(
      { label: '📱 Open Load Request', path: '/user/load-request', color: 'emerald' },
      { label: '📜 View Load History', path: '/user/load-history', color: 'slate' }
    );
  }

  if (troubleshootIntent) {
    actions.push(
      { label: '🛠 Open Troubleshooting', path: '/troubleshoot', color: 'blue' },
      { label: '📋 File a Ticket', path: '/user/report-problem', color: 'red' },
      { label: '🔧 Request Technician', path: '/user/technician-request', color: 'slate' }
    );
    quickReplies.push('No Signal', 'Remote not working');
  }

  if (ticketStatusIntent) {
    actions.unshift({ label: '🎫 My Tickets', path: '/user/tickets', color: 'slate' });
  }

  if (technicianStatusIntent) {
    actions.unshift({ label: '🔧 Technician Requests', path: '/user/technician-request', color: 'slate' });
  }

  if (loadStatusIntent) {
    actions.unshift({ label: '📜 View Load History', path: '/user/load-history', color: 'slate' });
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
  getChatbotKnowledge,
  buildChatbotUiHints,
};
