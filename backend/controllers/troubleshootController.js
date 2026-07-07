const {
  getAllModels,
  getIssuesByModel,
  getIssueWithSteps
} = require("../models/troubleshootModel");

async function getModels(req, res) {
  try {
    const models = await getAllModels();
    return res.json({ models });
  } catch (err) {
    console.error("GET MODELS ERROR", err);
    return res.status(500).json({ error: "Server error fetching models" });
  }
}

async function getIssues(req, res) {
  try {
    const { modelId } = req.params;
    const issues = await getIssuesByModel(modelId);
    return res.json({ issues });
  } catch (err) {
    console.error("GET ISSUES ERROR", err);
    return res.status(500).json({ error: "Server error fetching issues" });
  }
}

async function getIssueDetails(req, res) {
  try {
    const { issueId } = req.params;
    const data = await getIssueWithSteps(issueId);
    if (!data) return res.status(404).json({ error: "Issue not found" });
    return res.json(data);
  } catch (err) {
    console.error("GET ISSUE DETAILS ERROR", err);
    return res.status(500).json({ error: "Server error fetching issue details" });
  }
}

module.exports = {
  getModels,
  getIssues,
  getIssueDetails
};
