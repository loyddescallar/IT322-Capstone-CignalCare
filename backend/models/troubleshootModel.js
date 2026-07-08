const pool = require("../config/db");

async function getAllModels() {
  const [rows] = await pool.query(
    "SELECT * FROM troubleshoot_models ORDER BY name ASC"
  );
  return rows;
}

async function getIssuesByModel(modelId) {
  const [rows] = await pool.query(
    "SELECT * FROM troubleshoot_issues WHERE model_id = ? ORDER BY id ASC",
    [modelId]
  );
  return rows;
}

async function getIssueWithSteps(issueId) {
  const [issues] = await pool.query(
    "SELECT * FROM troubleshoot_issues WHERE id = ? LIMIT 1",
    [issueId]
  );
  if (!issues[0]) return null;

  const [steps] = await pool.query(
    "SELECT * FROM troubleshoot_steps WHERE issue_id = ? ORDER BY step_number ASC",
    [issueId]
  );

  return {
    issue: issues[0],
    steps
  };
}

module.exports = {
  getAllModels,
  getIssuesByModel,
  getIssueWithSteps
};
