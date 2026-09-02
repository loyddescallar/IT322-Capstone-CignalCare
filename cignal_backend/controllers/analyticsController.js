const pool = require('../config/db');
const { getAllOutcomes } = require('../models/troubleshootOutcomeModel');
const {
  getIncidentStats,
  syncIncidentCandidates,
  issueDescriptor,
  getIncidentDetectionPolicy,
} = require('../models/incidentModel');

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const SUPPORT_MODE_ORDER = ['full', 'quick_restart', 'factory_reset', 'video'];
const SUPPORT_MODE_LABELS = {
  full: 'Full Troubleshooting Guide',
  quick_restart: 'Quick Restart',
  factory_reset: 'Factory Reset',
  video: 'Video Guide',
};

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function manilaDayKey(value) {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function normLoc(value) {
  const location = String(value || 'Unknown').trim();
  return /calaca/i.test(location) ? 'Calaca' : location || 'Unknown';
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function avg(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function inRange(value, days) {
  const date = toDate(value);
  return date && (!days || date >= new Date(Date.now() - days * 86400000));
}

function ticketResolved(ticket) {
  return ['Resolved', 'Archived'].includes(String(ticket.status || ''));
}

function issueLabel(ticket) {
  return issueDescriptor(ticket)?.label || String(ticket.category || 'Other Support Concern').trim();
}

function supportMode(row) {
  const mode = String(row.support_mode || 'full').trim();
  return SUPPORT_MODE_ORDER.includes(mode) ? mode : 'full';
}

function sessionKey(row) {
  const explicit = String(row.session_id || '').trim();
  return explicit || `legacy:${row.id}`;
}

function isFinal(row) {
  return Number(row.is_final ?? 1) !== 0;
}

function buildMethodPerformance(rows) {
  return SUPPORT_MODE_ORDER.map((mode) => {
    const modeRows = rows.filter((row) => supportMode(row) === mode);
    const attemptKeys = new Set();
    const terminalBySession = new Map();
    let videoViews = 0;

    modeRows.forEach((row) => {
      const key = sessionKey(row);
      if (['started', 'viewed', 'resolved', 'unresolved'].includes(String(row.outcome))) {
        attemptKeys.add(key);
      }
      if (String(row.outcome) === 'viewed') videoViews += 1;
      if (
        ['resolved', 'unresolved'].includes(String(row.outcome)) &&
        !terminalBySession.has(key)
      ) {
        // Rows are returned newest-first, so the first terminal event is the latest.
        terminalBySession.set(key, String(row.outcome));
      }
    });

    const terminalValues = [...terminalBySession.values()];
    const resolved = terminalValues.filter((value) => value === 'resolved').length;
    const unresolved = terminalValues.filter((value) => value === 'unresolved').length;
    const completed = terminalValues.length;
    const attempts = attemptKeys.size;

    return {
      mode,
      label: SUPPORT_MODE_LABELS[mode],
      attempts,
      completed,
      resolved,
      unresolved,
      abandoned: Math.max(0, attempts - completed),
      successRate: pct(resolved, completed),
      videoViews: mode === 'video' ? videoViews : 0,
    };
  });
}

function buildFinalSessionAssessments(rows) {
  const finalBySession = new Map();
  rows.forEach((row) => {
    if (!['resolved', 'unresolved'].includes(String(row.outcome)) || !isFinal(row)) return;
    const key = sessionKey(row);
    if (!finalBySession.has(key)) finalBySession.set(key, row);
  });
  return [...finalBySession.values()];
}

function buildBoxIssueEffectiveness(finalAssessments) {
  const map = {};
  finalAssessments.forEach((row) => {
    const model = row.model_name || row.model_id || 'Unknown receiver';
    const issue = row.issue_label || row.issue_id || 'Unknown issue';
    const key = `${model} — ${issue}`;
    if (!map[key]) {
      map[key] = {
        guide: key,
        model,
        issue,
        resolved: 0,
        unresolved: 0,
        total: 0,
      };
    }
    map[key][String(row.outcome)] += 1;
    map[key].total += 1;
  });

  return Object.values(map)
    .map((row) => ({ ...row, resolutionRate: pct(row.resolved, row.total) }))
    .sort((a, b) => b.total - a.total || a.resolutionRate - b.resolutionRate)
    .slice(0, 12);
}

function buildSupportFunnel(rows) {
  const sessions = new Map();

  // A funnel requires a shared session id so stages can be linked correctly.
  // Older outcome rows are still used by the other analytics, but are excluded
  // here because they predate session tracking and cannot be safely connected.
  rows
    .filter((row) => String(row.session_id || '').trim())
    .forEach((row) => {
    const key = sessionKey(row);
    if (!sessions.has(key)) {
      sessions.set(key, {
        finalOutcome: '',
        ticket: false,
        technician: false,
      });
    }
    const session = sessions.get(key);
    const outcome = String(row.outcome || '');

    if (
      ['resolved', 'unresolved'].includes(outcome) &&
      isFinal(row) &&
      !session.finalOutcome
    ) {
      session.finalOutcome = outcome;
    }
    if (outcome === 'ticket') session.ticket = true;
    if (outcome === 'technician') session.technician = true;
  });

  const values = [...sessions.values()];
  return {
    sessions: values.length,
    selfResolved: values.filter((session) => session.finalOutcome === 'resolved').length,
    unresolved: values.filter((session) => session.finalOutcome === 'unresolved').length,
    ticketEscalations: values.filter((session) => session.ticket).length,
    technicianEscalations: values.filter((session) => session.technician).length,
    active: values.filter(
      (session) => !session.finalOutcome && !session.ticket && !session.technician
    ).length,
  };
}

async function getAdminAnalytics(req, res) {
  try {
    await syncIncidentCandidates();

    const [userResult, ticketResult, techResult, salesResult] = await Promise.all([
      pool.query(
        `SELECT id, accountName, accountNumber, location, status, created_at FROM users WHERE role='user'`
      ),
      pool.query(
        `SELECT t.*,u.location,u.accountNumber,u.accountName FROM tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`
      ),
      pool.query(
        `SELECT tr.*,u.location FROM technician_requests tr LEFT JOIN users u ON u.id=tr.user_id ORDER BY tr.created_at DESC`
      ),
      pool.query(
        `SELECT pt.*,u.location,p.plan_name FROM prepaid_transactions pt LEFT JOIN users u ON u.id=pt.user_id LEFT JOIN prepaid_plans p ON p.id=pt.plan_id WHERE pt.status='completed' AND pt.reference_no LIKE 'POS-%' ORDER BY pt.transaction_date DESC`
      ),
    ]);

    const outcomes = await getAllOutcomes();
    const incidents = await getIncidentStats();
    const incidentDetectionPolicy = getIncidentDetectionPolicy();
    const customers = userResult[0];
    const allTickets = ticketResult[0];
    const allTech = techResult[0];
    const allSales = salesResult[0];

    const locationFilter = String(req.query.location || '').trim();
    const rawDays = Number(req.query.days || 30);
    const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : null;
    const byLoc = (row) =>
      !locationFilter || normLoc(row.location) === normLoc(locationFilter);

    const activeCustomers = customers.filter(
      (customer) => String(customer.status || 'active') === 'active' && byLoc(customer)
    );
    const tickets = allTickets.filter(
      (ticket) => byLoc(ticket) && inRange(ticket.created_at, days)
    );
    const tech = allTech.filter(
      (request) => byLoc(request) && inRange(request.created_at, days)
    );
    const sales = allSales.filter(
      (sale) => byLoc(sale) && inRange(sale.transaction_date || sale.created_at, days)
    );
    const outcomeRows = outcomes.filter(
      (outcome) => byLoc(outcome) && inRange(outcome.created_at, days)
    );
    const incidentRows = incidents.filter(
      (incident) => byLoc(incident) && inRange(incident.created_at, days)
    );

    const today = manilaDayKey(new Date());
    const salesToday = sales.filter(
      (sale) => manilaDayKey(sale.transaction_date || sale.created_at) === today
    );
    const ticketsToday = tickets.filter((ticket) => manilaDayKey(ticket.created_at) === today);
    const resolved = tickets.filter(ticketResolved);
    const resolvedToday = resolved.filter(
      (ticket) => manilaDayKey(ticket.updated_at || ticket.created_at) === today
    );
    const resolutionHours = resolved
      .map((ticket) => {
        const created = toDate(ticket.created_at);
        const updated = toDate(ticket.updated_at);
        return created && updated ? Math.max(0, (updated - created) / 3600000) : null;
      })
      .filter((value) => value != null);

    const issueMap = {};
    tickets.forEach((ticket) => {
      const label = issueLabel(ticket);
      issueMap[label] = (issueMap[label] || 0) + 1;
    });
    const topIssues = Object.entries(issueMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    const userTickets = {};
    tickets.forEach((ticket) => {
      userTickets[ticket.user_id] = (userTickets[ticket.user_id] || 0) + 1;
    });
    const repeatUsers = Object.values(userTickets).filter((count) => count >= 2).length;

    const locs = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
    const locationMap = {};
    for (const loc of locs) {
      const subscribers = customers.filter(
        (customer) =>
          String(customer.status || 'active') === 'active' && normLoc(customer.location) === loc
      ).length;
      const support = allTickets.filter(
        (ticket) => normLoc(ticket.location) === loc && inRange(ticket.created_at, days)
      ).length;
      const technicians = allTech.filter(
        (request) => normLoc(request.location) === loc && inRange(request.created_at, days)
      ).length;
      locationMap[loc] = {
        location: loc,
        subscribers,
        support,
        technicians,
        supportPer100: subscribers ? Number(((support / subscribers) * 100).toFixed(1)) : 0,
      };
    }

    const finalAssessments = buildFinalSessionAssessments(outcomeRows);
    const selfResolved = finalAssessments.filter((row) => row.outcome === 'resolved').length;
    const ticketEscalations = new Set(
      outcomeRows.filter((row) => row.outcome === 'ticket').map(sessionKey)
    ).size;
    const techEscalations = new Set(
      outcomeRows.filter((row) => row.outcome === 'technician').map(sessionKey)
    ).size;
    const selfServiceMethods = buildMethodPerformance(outcomeRows);
    const boxIssueEffectiveness = buildBoxIssueEffectiveness(finalAssessments);
    const supportFunnel = buildSupportFunnel(outcomeRows);

    // Preserve the existing API field for older frontend consumers.
    const guidePerformance = boxIssueEffectiveness.slice(0, 10);

    const trend = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400000);
      const key = manilaDayKey(date);
      trend.push({
        date: key,
        label: date.toLocaleDateString('en-PH', {
          timeZone: 'Asia/Manila',
          month: 'short',
          day: 'numeric',
        }),
        sales: Number(
          sales
            .filter((sale) => manilaDayKey(sale.transaction_date || sale.created_at) === key)
            .reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
            .toFixed(2)
        ),
        support: tickets.filter((ticket) => manilaDayKey(ticket.created_at) === key).length,
        resolved: resolved.filter(
          (ticket) => manilaDayKey(ticket.updated_at || ticket.created_at) === key
        ).length,
      });
    }

    const salesByPlan = {};
    sales.forEach((sale) => {
      const key = sale.plan_name || `Plan ${sale.plan_id}`;
      if (!salesByPlan[key]) salesByPlan[key] = { label: key, revenue: 0, count: 0 };
      salesByPlan[key].revenue += Number(sale.amount || 0);
      salesByPlan[key].count += 1;
    });

    const salesByLocation = {};
    sales.forEach((sale) => {
      const key = normLoc(sale.location);
      if (!salesByLocation[key]) {
        salesByLocation[key] = { location: key, revenue: 0, count: 0 };
      }
      salesByLocation[key].revenue += Number(sale.amount || 0);
      salesByLocation[key].count += 1;
    });

    const activeIncidents = incidentRows.filter((incident) => incident.status === 'confirmed');
    const recentTickets = tickets.slice(0, 8).map((ticket) => ({
      ...ticket,
      issue_label: issueLabel(ticket),
    }));
    const candidates = incidentRows.filter((incident) => incident.status === 'candidate');
    const hotspot = Object.values(locationMap).sort(
      (a, b) => b.supportPer100 - a.supportPer100
    )[0] || null;
    const topIssue = topIssues[0] || null;
    const insights = [];

    if (candidates.length) {
      insights.push({
        severity: 'warning',
        title: 'Possible common issue',
        text: `${candidates.length} incident candidate${candidates.length > 1 ? 's' : ''} require Admin review.`,
      });
    }
    if (hotspot && hotspot.support > 0) {
      insights.push({
        severity: 'info',
        title: 'Location hotspot',
        text: `${hotspot.location} recorded ${hotspot.supportPer100} support interactions per 100 active subscribers in this period (${hotspot.support} ticket${hotspot.support === 1 ? '' : 's'}).`,
      });
    }
    if (topIssue) {
      insights.push({
        severity: 'info',
        title: 'Top support concern',
        text: `${topIssue.label} is the most reported concern (${topIssue.count} reports).`,
      });
    }
    if (finalAssessments.length) {
      insights.push({
        severity: 'info',
        title: 'Self-service performance',
        text: `Verified troubleshooting resolved ${pct(selfResolved, finalAssessments.length)}% of ${finalAssessments.length} completed troubleshooting session${finalAssessments.length === 1 ? '' : 's'}.`,
      });
    }

    return res.json({
      filters: { days, location: locationFilter || null },
      kpis: {
        salesToday: Number(
          salesToday.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)
        ),
        supportToday: ticketsToday.length,
        resolvedToday: resolvedToday.length,
        technicianRequests: tech.filter((request) => request.status !== 'Cancelled').length,
        technicianEscalations: techEscalations,
        totalRevenue: Number(
          sales.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)
        ),
        posTransactions: sales.length,
        activeSubscribers: activeCustomers.length,
        totalTickets: tickets.length,
        resolvedTickets: resolved.length,
        resolutionRate: pct(resolved.length, tickets.length),
        avgResolutionHours: Number(avg(resolutionHours).toFixed(1)),
        repeatContactRate: pct(repeatUsers, Object.keys(userTickets).length),
        selfServiceResolutionRate: pct(selfResolved, finalAssessments.length),
        selfServiceAssessments: finalAssessments.length,
        ticketEscalations,
        technicianSelfServiceEscalations: techEscalations,
        activeIncidents: activeIncidents.length,
        incidentCandidates: candidates.length,
      },
      topIssues,
      locations: Object.values(locationMap).filter(
        (item) => !locationFilter || item.location === normLoc(locationFilter)
      ),
      guidePerformance,
      selfServiceMethods,
      boxIssueEffectiveness,
      supportFunnel,
      trend,
      salesByPlan: Object.values(salesByPlan).sort((a, b) => b.revenue - a.revenue),
      salesByLocation: Object.values(salesByLocation).sort(
        (a, b) => b.revenue - a.revenue
      ),
      technician: {
        total: tech.length,
        completed: tech.filter((request) => request.status === 'Completed').length,
        scheduled: tech.filter((request) => request.status === 'Scheduled').length,
        pending: tech.filter((request) =>
          ['Submitted', 'Under Review'].includes(request.status)
        ).length,
      },
      recentTickets,
      incidents: incidentRows,
      incidentDetectionPolicy,
      insights,
    });
  } catch (error) {
    console.error('ADMIN ANALYTICS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load business analytics.' });
  }
}

module.exports = { getAdminAnalytics };
