const pool = require('../config/db');
const {
  syncIncidentCandidates,
  listIncidents,
  countIncidents,
  listIncidentLocations,
  getIncidentById,
  getActiveIncidentsForLocation,
  confirmIncident,
  dismissIncident,
  resolveIncident,
  getIncidentDetectionPolicy,
} = require('../models/incidentModel');
const {
  createAdminNotification,
  createNotification,
} = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');

async function notifyNewCandidates(candidates) {
  for (const candidate of candidates) {
    await notifySafely('INCIDENT CANDIDATE', () =>
      createAdminNotification({
        type: 'admin_incident',
        message: `Possible common issue: ${candidate.distinctSubscribers} subscribers in ${candidate.location} reported ${candidate.issueLabel}. Review before declaring an incident.`,
      })
    );
  }
}

const VALID_STATUSES = new Set(['candidate', 'confirmed', 'resolved', 'dismissed']);
let detectionInFlight = null;

async function listAdminIncidents(req, res) {
  try {
    // A list request never runs detection or modifies data.
    const status = String(req.query.status || '').trim().toLowerCase();
    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid incident status.' });
    }
    const search = String(req.query.search || '').trim().slice(0, 100);
    const location = String(req.query.location || '').trim().slice(0, 100);
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const offset = Math.min(1000000, Math.max(0, parseInt(req.query.offset, 10) || 0));
    const filters = { status: status || null, search, location };
    const [incidents, total, locations] = await Promise.all([
      listIncidents({ ...filters, sort, limit, offset }),
      countIncidents(filters),
      req.query.includeLocations === '1' ? listIncidentLocations() : Promise.resolve(null),
    ]);
    return res.json({
      incidents, total, hasMore: offset + incidents.length < total,
      ...(locations === null ? {} : { locations }),
      newlyDetected: 0, detectionPolicy: getIncidentDetectionPolicy(),
    });
  } catch (error) {
    console.error('LIST INCIDENTS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load support incidents.' });
  }
}

async function detectAdminIncidentCandidates(req, res) {
  try {
    // Coalesce same-process concurrent detection requests to prevent duplicate alerts.
    if (!detectionInFlight) {
      detectionInFlight = (async () => {
        const created = await syncIncidentCandidates();
        await notifyNewCandidates(created);
        return created;
      })().finally(() => { detectionInFlight = null; });
    }
    const created = await detectionInFlight;
    return res.json({ newlyDetected: created.length, detectionPolicy: getIncidentDetectionPolicy() });
  } catch (error) {
    console.error('DETECT INCIDENTS ERROR:', error);
    return res.status(500).json({ error: 'Unable to detect incident candidates.' });
  }
}

async function getMyIncidents(req, res) {
  try {
    return res.json({
      incidents: await getActiveIncidentsForLocation(req.user.location),
    });
  } catch (error) {
    console.error('GET CUSTOMER INCIDENTS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load service advisories.' });
  }
}

async function confirmAdminIncident(req, res) {
  try {
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    const outcome = await confirmIncident(req.params.id, req.user.id, notes);
    if (!outcome) return res.status(404).json({ error: 'Incident not found.' });
    if (!outcome.changed) {
      return res.status(409).json({ error: 'This incident is no longer awaiting review. Refresh the board.' });
    }
    const incident = outcome.incident;
    const [users] = await pool.query(
      `SELECT id, accountNumber FROM users WHERE role='user' AND status='active' AND location=?`,
      [incident.location]
    );
    await notifySafely('CONFIRM INCIDENT', async () => {
      for (const user of users) {
        await createNotification({
          user_id: user.id,
          account_number: user.accountNumber,
          type: 'service_incident',
          message: `Service advisory for ${incident.location}: ${incident.issue_label}. Descallar Satellite Services is reviewing this confirmed common issue. You may still submit an individual concern if your situation is different.`,
        });
      }
    });
    return res.json({ message: 'Incident confirmed.', incident });
  } catch (error) {
    console.error('CONFIRM INCIDENT ERROR:', error);
    return res.status(500).json({ error: 'Unable to confirm incident.' });
  }
}

async function dismissAdminIncident(req, res) {
  try {
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    if (!notes) return res.status(400).json({ error: 'A dismissal reason is required.' });
    const outcome = await dismissIncident(req.params.id, notes);
    if (!outcome) return res.status(404).json({ error: 'Incident not found.' });
    if (!outcome.changed) {
      return res.status(409).json({ error: 'Only incidents awaiting review can be dismissed. Refresh the board.' });
    }
    return res.json({ message: 'Possible incident dismissed. Customer tickets were not changed.', incident: outcome.incident });
  } catch (error) {
    console.error('DISMISS INCIDENT ERROR:', error);
    return res.status(500).json({ error: 'Unable to dismiss incident.' });
  }
}

async function resolveAdminIncident(req, res) {
  try {
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    const outcome = await resolveIncident(req.params.id, notes);
    if (!outcome) return res.status(404).json({ error: 'Incident not found.' });
    if (!outcome.changed) {
      return res.status(409).json({ error: 'Only confirmed incidents can be resolved. Refresh the board.' });
    }
    return res.json({ message: 'Incident marked resolved.', incident: outcome.incident });
  } catch (error) {
    console.error('RESOLVE INCIDENT ERROR:', error);
    return res.status(500).json({ error: 'Unable to resolve incident.' });
  }
}

module.exports = {
  listAdminIncidents,
  detectAdminIncidentCandidates,
  getMyIncidents,
  confirmAdminIncident,
  dismissAdminIncident,
  resolveAdminIncident,
};
