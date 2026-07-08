const express = require("express");
const router = express.Router();

const {
  getModels,
  getIssues,
  getIssueDetails
} = require("../controllers/troubleshootController");

// Public troubleshooting (no auth needed)
router.get("/models", getModels);
router.get("/models/:modelId/issues", getIssues);
router.get("/issues/:issueId", getIssueDetails);

module.exports = router;
