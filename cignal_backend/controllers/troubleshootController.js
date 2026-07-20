const pool = require('../config/db');

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function getModels(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        m.id,
        m.name,
        m.description,
        m.status,
        COUNT(i.id) AS issue_count
      FROM troubleshoot_models m
      LEFT JOIN troubleshoot_issues i
        ON i.model_id = m.id
      WHERE m.status = 'active'
      GROUP BY m.id, m.name, m.description, m.status
      ORDER BY m.id ASC
    `);

    return res.json({ models: rows });
  } catch (error) {
    console.error('GET TROUBLESHOOT MODELS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load troubleshooting models' });
  }
}

async function getIssuesByModel(req, res) {
  const modelId = parsePositiveInteger(req.params.modelId);

  if (!modelId) {
    return res.status(400).json({ error: 'Invalid model ID' });
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          model_id,
          title,
          description,
          category,
          error_code
        FROM troubleshoot_issues
        WHERE model_id = ?
        ORDER BY id ASC
      `,
      [modelId]
    );

    return res.json({ issues: rows });
  } catch (error) {
    console.error('GET TROUBLESHOOT ISSUES ERROR:', error);
    return res.status(500).json({ error: 'Unable to load troubleshooting issues' });
  }
}

async function getStepsByIssue(req, res) {
  const issueId = parsePositiveInteger(req.params.issueId);

  if (!issueId) {
    return res.status(400).json({ error: 'Invalid issue ID' });
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          issue_id,
          step_number,
          instruction
        FROM troubleshoot_steps
        WHERE issue_id = ?
        ORDER BY step_number ASC, id ASC
      `,
      [issueId]
    );

    return res.json({ steps: rows });
  } catch (error) {
    console.error('GET TROUBLESHOOT STEPS ERROR:', error);
    return res.status(500).json({ error: 'Unable to load troubleshooting steps' });
  }
}

module.exports = {
  getModels,
  getIssuesByModel,
  getStepsByIssue,
};
