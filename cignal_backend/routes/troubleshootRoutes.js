const express = require('express');
const router = express.Router();
const { getModels, getIssuesByModel, getStepsByIssue, recordTroubleshootOutcome } = require('../controllers/troubleshootController');
const { authRequired, requireRole } = require('../middleware/auth');
router.get('/models', getModels);
router.get('/models/:modelId/issues', getIssuesByModel);
router.get('/issues/:issueId/steps', getStepsByIssue);
router.post('/outcomes', authRequired, requireRole('user'), recordTroubleshootOutcome);
module.exports = router;
