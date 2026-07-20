const pool = require('../config/db');

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
  const [rows] = await pool.query(`
    SELECT
      m.id AS model_id,
      m.name AS model_name,
      m.description AS model_description,
      i.id AS issue_id,
      i.title AS issue_title,
      i.description AS issue_description,
      i.category,
      i.error_code,
      s.step_number,
      s.instruction
    FROM troubleshoot_models m
    INNER JOIN troubleshoot_issues i
      ON i.model_id = m.id
    LEFT JOIN troubleshoot_steps s
      ON s.issue_id = i.id
    WHERE m.status = 'active'
    ORDER BY m.id ASC, i.id ASC, s.step_number ASC
  `);

  const issueMap = new Map();

  for (const row of rows) {
    const key = String(row.issue_id);

    if (!issueMap.has(key)) {
      issueMap.set(key, {
        issueId: row.issue_id,
        modelId: row.model_id,
        modelName: row.model_name,
        modelDescription: row.model_description,
        title: row.issue_title,
        description: row.issue_description,
        category: row.category,
        errorCode: row.error_code,
        steps: [],
      });
    }

    if (row.instruction) {
      issueMap.get(key).steps.push({
        stepNumber: Number(row.step_number || 0),
        instruction: String(row.instruction).trim(),
      });
    }
  }

  return Array.from(issueMap.values());
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
            .map((step) => `${step.stepNumber}. ${step.instruction}`)
            .join(' ')
        : 'No troubleshooting steps are currently configured.';

      return [
        `- Model: ${issue.modelName}`,
        `Issue: ${issue.title}`,
        issue.errorCode ? `Error code: ${issue.errorCode}` : '',
        issue.description ? `Description: ${issue.description}` : '',
        `Verified steps: ${steps}`,
      ]
        .filter(Boolean)
        .join(' | ');
    });

    sections.push(
      [
        'CURRENT TROUBLESHOOTING KNOWLEDGE (database source of truth):',
        ...troubleshootingLines,
      ].join('\n')
    );
  }

  return sections.join('\n\n');
}

async function getChatbotKnowledge() {
  const [plans, troubleshooting] = await Promise.all([
    getActiveLoadPlans(),
    getTroubleshootingKnowledge(),
  ]);

  return {
    plans,
    troubleshooting,
    text: buildKnowledgeText({ plans, troubleshooting }),
  };
}

function buildChatbotUiHints(message = '') {
  const normalized = String(message).toLowerCase();
  const actions = [];
  const quickReplies = [];

  const loadIntent = /(load|reload|prepaid|plan|package|payment|paymongo|channel lineup|available load)/i.test(normalized);
  const troubleshootIntent = /(signal|screen|remote|receiver|box|channel|record|dvr|hd|picture|display|technical|troubleshoot|problema|sira|gumagana|working|error)/i.test(normalized);

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

  return {
    actions: actions.slice(0, 3),
    quickReplies: [...new Set(quickReplies)].slice(0, 4),
  };
}

module.exports = {
  getActiveLoadPlans,
  getTroubleshootingKnowledge,
  getChatbotKnowledge,
  buildChatbotUiHints,
};
