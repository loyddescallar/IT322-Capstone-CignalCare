const pool = require('../config/db');
const {
  syncIncidentCandidates,
  listIncidents,
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

async function listAdminIncidents(req, res) {
  try {
    const created = await syncIncidentCandidates();
    await notifyNewCandidates(created);
    const incidents = await listIncidents({ status: req.query.status || null });

    return res.json({
      incidents,
      newlyDetected: created.length,
      detectionPolicy: getIncidentDetectionPolicy(),
    });
  } catch (error) {
    console.error('LIST INCIDENTS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load support incidents.' });
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
    const incident = await confirmIncident(
      req.params.id,
      req.user.id,
      req.body?.notes
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    const [users] = await pool.query(
      `SELECT id, accountNumber FROM users
       WHERE role='user' AND status='active' AND location=?`,
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
    if (!(await getIncidentById(req.params.id))) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    return res.json({
      message: 'Possible incident dismissed. Customer tickets were not changed.',
      incident: await dismissIncident(req.params.id, req.body?.notes),
    });
  } catch (error) {
    console.error('DISMISS INCIDENT ERROR:', error);
    return res.status(500).json({ error: 'Unable to dismiss incident.' });
  }
}

async function resolveAdminIncident(req, res) {
  try {
    const incident = await resolveIncident(req.params.id, req.body?.notes);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    return res.json({ message: 'Incident marked resolved.', incident });
  } catch (error) {
    console.error('RESOLVE INCIDENT ERROR:', error);
    return res.status(500).json({ error: 'Unable to resolve incident.' });
  }
}

module.exports = {
  listAdminIncidents,
  getMyIncidents,
  confirmAdminIncident,
  dismissAdminIncident,
  resolveAdminIncident,
};
