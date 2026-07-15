const pool = require('../config/db');

async function getModels(req, res) {
  try { const [rows]=await pool.query("SELECT * FROM troubleshoot_models WHERE status='active'"); return res.json({ models:rows }); }
  catch(err) { return res.status(500).json({ error:'Server error' }); }
}
async function getIssuesByModel(req, res) {
  try { const [rows]=await pool.query("SELECT * FROM troubleshoot_issues WHERE model_id=?",[req.params.modelId]); return res.json({ issues:rows }); }
  catch(err) { return res.status(500).json({ error:'Server error' }); }
}
async function getStepsByIssue(req, res) {
  try { const [rows]=await pool.query("SELECT * FROM troubleshoot_steps WHERE issue_id=? ORDER BY step_number ASC",[req.params.issueId]); return res.json({ steps:rows }); }
  catch(err) { return res.status(500).json({ error:'Server error' }); }
}
module.exports = { getModels, getIssuesByModel, getStepsByIssue };
