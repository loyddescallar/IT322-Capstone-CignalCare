const crypto = require('crypto');
const pool = require('../config/db');

let schemaReady = false;

const GENERIC_ISSUES = new Set([
  'technical problem',
  'other',
  'others',
  'general concern',
  'connection issue',
  'support request',
]);

function envInteger(name, fallback, min, max) {
  const parsed = Number.parseInt(String(process.env[name] || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

const INCIDENT_DETECTION_POLICY = Object.freeze({
  minDistinctSubscribers: envInteger('INCIDENT_MIN_DISTINCT_SUBSCRIBERS', 3, 2, 50),
  windowHours: envInteger('INCIDENT_WINDOW_HOURS', 6, 1, 72),
  decisionCooldownHours: envInteger('INCIDENT_DECISION_COOLDOWN_HOURS', 24, 1, 168),
});

function getIncidentDetectionPolicy() {
  return { ...INCIDENT_DETECTION_POLICY };
}

function normalizeLocation(value) {
  const text = String(value || '').trim();
  if (!text) return 'Unknown';
  if (/calaca/i.test(text)) return 'Calaca';
  return text;
}

function issueDescriptor(ticket) {
  const text = `${ticket?.subject || ''} ${ticket?.category || ''}`.toLowerCase();
  const patterns = [
    ['no_signal', 'No Signal', /\bno\s+signal\b|signal\s+lost|walang\s+signal/i],
    ['weak_signal', 'Weak / Pixelated Signal', /weak\s+signal|pixelat|intermittent\s+signal|mahina.*signal/i],
    ['missing_channels', 'Missing / No Channels', /missing\s+channel|no\s+channel|channel.*missing|walang\s+channel/i],
    ['black_screen', 'Black Screen', /black\s+screen|blank\s+screen/i],
    ['remote_issue', 'Remote Control Issue', /remote.*(not|doesn|working|respond)|remote\s+control/i],
    ['receiver_error', 'Receiver Error', /\be(?:1|2|11)\b|receiver\s+error|box\s+error/i],
    ['recording_issue', 'Recording / DVR Issue', /record|dvr/i],
  ];

  for (const [key, label, regex] of patterns) {
    if (regex.test(text)) return { key, label };
  }

  const category = String(ticket?.category || '').trim();
  if (
    category &&
    !GENERIC_ISSUES.has(category.toLowerCase()) &&
    category.length >= 5
  ) {
    return {
      key: category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 80),
      label: category,
    };
  }

  return null;
}

async function ensureIncidentSchema() {
  if (schemaReady) return;

  await pool.query(`CREATE TABLE IF NOT EXISTS support_incidents (
    id VARCHAR(36) PRIMARY KEY,
    issue_key VARCHAR(100) NOT NULL,
    issue_label VARCHAR(160) NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'candidate',
    report_count INTEGER NOT NULL DEFAULT 0,
    distinct_subscribers INTEGER NOT NULL DEFAULT 0,
    first_reported_at TIMESTAMP NULL,
    last_reported_at TIMESTAMP NULL,
    confirmed_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    confirmed_by INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
  )`);

  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS incident_id VARCHAR(36)`);
  await pool.query(`ALTER TABLE technician_requests ADD COLUMN IF NOT EXISTS incident_id VARCHAR(36)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_incidents_status_location ON support_incidents (status, location)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_incident ON tickets (incident_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_technician_incident ON technician_requests (incident_id)`);

  schemaReady = true;
}

async function getRecentUnresolvedTickets(hours = INCIDENT_DETECTION_POLICY.windowHours) {
  await ensureIncidentSchema();
  const safeHours = Math.min(Math.max(Number(hours) || INCIDENT_DETECTION_POLICY.windowHours, 1), 72);

  const [rows] = await pool.query(`SELECT t.*, u.accountName, u.accountNumber, u.location
    FROM tickets t JOIN users u ON u.id=t.user_id
    WHERE t.status NOT IN ('Resolved','Archived')
      AND t.created_at >= NOW() - INTERVAL '${safeHours} hours'
      AND COALESCE(u.status,'active')='active'
    ORDER BY t.created_at ASC`);

  return rows;
}

function groupPotentialIncidents(tickets = []) {
  const groups = new Map();

  for (const ticket of tickets) {
    const issue = issueDescriptor(ticket);
    if (!issue) continue;

    const location = normalizeLocation(ticket.location);
    if (location === 'Unknown') continue;

    const key = `${location.toLowerCase()}::${issue.key}`;
    if (!groups.has(key)) {
      groups.set(key, {
        issue,
        location,
        tickets: [],
        users: new Set(),
      });
    }

    const group = groups.get(key);
    group.tickets.push(ticket);
    group.users.add(String(ticket.user_id));
  }

  return Array.from(groups.values())
    .filter((group) => group.users.size >= INCIDENT_DETECTION_POLICY.minDistinctSubscribers)
    .map((group) => ({
      issueKey: group.issue.key,
      issueLabel: group.issue.label,
      location: group.location,
      reportCount: group.tickets.length,
      distinctSubscribers: group.users.size,
      firstReportedAt: group.tickets[0]?.created_at || null,
      lastReportedAt: group.tickets[group.tickets.length - 1]?.created_at || null,
      ticketIds: group.tickets.map((ticket) => ticket.id),
    }));
}

async function findRecentIncident(issueKey, location) {
  const hours = INCIDENT_DETECTION_POLICY.decisionCooldownHours;
  const [rows] = await pool.query(`SELECT * FROM support_incidents
    WHERE issue_key=? AND location=? AND status IN ('candidate','confirmed')
      AND created_at >= NOW() - INTERVAL '${hours} hours'
    ORDER BY created_at DESC LIMIT 1`, [issueKey, location]);
  return rows[0] || null;
}

async function isSuppressedByRecentDecision(issueKey, location, lastReportedAt) {
  const hours = INCIDENT_DETECTION_POLICY.decisionCooldownHours;
  const [rows] = await pool.query(`SELECT * FROM support_incidents
    WHERE issue_key=? AND location=? AND status IN ('dismissed','resolved')
      AND created_at >= NOW() - INTERVAL '${hours} hours'
    ORDER BY created_at DESC LIMIT 1`, [issueKey, location]);

  const row = rows[0];
  if (!row) return false;

  const decisionAt = row.dismissed_at || row.resolved_at || row.updated_at || row.created_at;
  return Boolean(
    decisionAt &&
    lastReportedAt &&
    new Date(lastReportedAt).getTime() <= new Date(decisionAt).getTime()
  );
}

async function syncIncidentCandidates(hours = INCIDENT_DETECTION_POLICY.windowHours) {
  await ensureIncidentSchema();
  const groups = groupPotentialIncidents(await getRecentUnresolvedTickets(hours));
  const created = [];

  for (const group of groups) {
    if (
      await isSuppressedByRecentDecision(
        group.issueKey,
        group.location,
        group.lastReportedAt
      )
    ) {
      continue;
    }

    const existing = await findRecentIncident(group.issueKey, group.location);
    if (existing) {
      await pool.query(
        `UPDATE support_incidents
         SET report_count=?, distinct_subscribers=?, first_reported_at=?, last_reported_at=?, updated_at=NOW()
         WHERE id=?`,
        [
          group.reportCount,
          group.distinctSubscribers,
          group.firstReportedAt,
          group.lastReportedAt,
          existing.id,
        ]
      );
      continue;
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO support_incidents
       (id,issue_key,issue_label,location,status,report_count,distinct_subscribers,first_reported_at,last_reported_at,created_at,updated_at)
       VALUES (?,?,?,?,'candidate',?,?,?,?,NOW(),NOW())`,
      [
        id,
        group.issueKey,
        group.issueLabel,
        group.location,
        group.reportCount,
        group.distinctSubscribers,
        group.firstReportedAt,
        group.lastReportedAt,
      ]
    );

    created.push({ id, ...group, status: 'candidate' });
  }

  return created;
}

async function listIncidents({ status = null, limit = 100 } = {}) {
  await ensureIncidentSchema();
  const params = [];
  let where = '';

  if (status) {
    where = 'WHERE status=?';
    params.push(status);
  }

  params.push(Number(limit));
  const [rows] = await pool.query(
    `SELECT * FROM support_incidents ${where}
     ORDER BY CASE status WHEN 'candidate' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
              created_at DESC
     LIMIT ?`,
    params
  );
  return rows;
}

async function getIncidentById(id) {
  await ensureIncidentSchema();
  const [rows] = await pool.query(
    `SELECT * FROM support_incidents WHERE id=? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getActiveIncidentsForLocation(location) {
  await ensureIncidentSchema();
  const [rows] = await pool.query(
    `SELECT * FROM support_incidents
     WHERE status='confirmed' AND location=?
     ORDER BY confirmed_at DESC, created_at DESC`,
    [normalizeLocation(location)]
  );
  return rows;
}

async function linkMatchingRecords(incident) {
  const [tickets] = await pool.query(
    `SELECT t.id,t.subject,t.category FROM tickets t JOIN users u ON u.id=t.user_id
     WHERE t.incident_id IS NULL AND u.location=? AND t.status NOT IN ('Resolved','Archived')`,
    [incident.location]
  );

  for (const ticket of tickets) {
    if (issueDescriptor(ticket)?.key === incident.issue_key) {
      await pool.query(`UPDATE tickets SET incident_id=? WHERE id=?`, [incident.id, ticket.id]);
    }
  }

  const [requests] = await pool.query(
    `SELECT tr.id,tr.issueDescription FROM technician_requests tr JOIN users u ON u.id=tr.user_id
     WHERE tr.incident_id IS NULL AND u.location=? AND tr.status NOT IN ('Completed','Cancelled')`,
    [incident.location]
  );

  for (const request of requests) {
    if (
      issueDescriptor({ subject: request.issueDescription, category: '' })?.key ===
      incident.issue_key
    ) {
      await pool.query(
        `UPDATE technician_requests SET incident_id=? WHERE id=?`,
        [incident.id, request.id]
      );
    }
  }
}

async function confirmIncident(id, adminId, notes = null) {
  const incident = await getIncidentById(id);
  if (!incident) return null;
  if (['dismissed', 'resolved'].includes(incident.status)) return incident;

  await pool.query(
    `UPDATE support_incidents
     SET status='confirmed', confirmed_at=NOW(), confirmed_by=?, notes=?, updated_at=NOW()
     WHERE id=?`,
    [adminId, notes || incident.notes || null, id]
  );

  const updated = await getIncidentById(id);
  await linkMatchingRecords(updated);
  return updated;
}

async function dismissIncident(id, notes = null) {
  await pool.query(
    `UPDATE support_incidents
     SET status='dismissed', dismissed_at=NOW(), notes=?, updated_at=NOW()
     WHERE id=? AND status='candidate'`,
    [notes || null, id]
  );
  return getIncidentById(id);
}

async function resolveIncident(id, notes = null) {
  await pool.query(
    `UPDATE support_incidents
     SET status='resolved', resolved_at=NOW(), notes=COALESCE(?,notes), updated_at=NOW()
     WHERE id=? AND status='confirmed'`,
    [notes || null, id]
  );
  return getIncidentById(id);
}

async function findActiveIncidentForText(location, text) {
  await ensureIncidentSchema();
  const [rows] = await pool.query(
    `SELECT * FROM support_incidents
     WHERE status='confirmed' AND location=?
     ORDER BY confirmed_at DESC`,
    [normalizeLocation(location)]
  );
  const descriptor = issueDescriptor({ subject: text, category: text });
  return descriptor
    ? rows.find((row) => row.issue_key === descriptor.key) || null
    : null;
}

async function linkTicketIfActive(ticketId, location, text) {
  const incident = await findActiveIncidentForText(location, text);
  if (!incident) return null;
  await pool.query(`UPDATE tickets SET incident_id=? WHERE id=?`, [incident.id, ticketId]);
  return incident;
}

async function linkTechnicianIfActive(requestId, location, text) {
  const incident = await findActiveIncidentForText(location, text);
  if (!incident) return null;
  await pool.query(
    `UPDATE technician_requests SET incident_id=? WHERE id=?`,
    [incident.id, requestId]
  );
  return incident;
}

async function getIncidentStats() {
  await ensureIncidentSchema();
  const [rows] = await pool.query(
    `SELECT * FROM support_incidents ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = {
  ensureIncidentSchema,
  getIncidentDetectionPolicy,
  normalizeLocation,
  issueDescriptor,
  syncIncidentCandidates,
  listIncidents,
  getIncidentById,
  getActiveIncidentsForLocation,
  confirmIncident,
  dismissIncident,
  resolveIncident,
  findActiveIncidentForText,
  linkTicketIfActive,
  linkTechnicianIfActive,
  getIncidentStats,
};
