const express = require('express');
const router = express.Router();
const { getModels, getIssuesByModel, getStepsByIssue } = require('../controllers/troubleshootController');
router.get('/models',                    getModels);
router.get('/models/:modelId/issues',    getIssuesByModel);
router.get('/issues/:issueId/steps',     getStepsByIssue);
module.exports = router;
