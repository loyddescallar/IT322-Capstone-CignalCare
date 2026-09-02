const {
  boxModels,
  findBoxModel,
  findTroubleshootIssue,
} = require('../data/troubleshootData');
const { recordOutcome } = require('../models/troubleshootOutcomeModel');

function getErrorCode(issue) {
  const title = String(issue?.shortTitle || '');
  return /^E\d/i.test(title) ? title : null;
}

function toGuideResponse(model) {
  const guide = model?.guide || {};
  return {
    verified: guide.verified === true,
    cardless: guide.cardless === true,
    display_mode: guide.displayMode || 'connection-guide',
    note: guide.note || '',
    components: Array.isArray(guide.components)
      ? guide.components.map((component) => ({
          id: component.id,
          name: component.name,
          area: component.area || '',
          kind: component.kind || '',
          description: component.description || '',
          related_issues: Array.isArray(component.relatedIssues)
            ? component.relatedIssues
            : [],
          caution: component.caution || '',
        }))
      : [],
    connections: Array.isArray(guide.connections)
      ? guide.connections.map((connection) => ({
          id: connection.id,
          from: connection.from,
          through: connection.through,
          to: connection.to,
          description: connection.description || '',
        }))
      : [],
  };
}

function toModelResponse(model, { includeGuide = false } = {}) {
  const response = {
    id: model.id,
    name: model.name,
    type: model.type,
    image: model.image,
    description: model.description || `${model.type || 'Cignal'} receiver`,
    status: 'active',
    issue_count: Array.isArray(model.issues) ? model.issues.length : 0,
    source_url: model.sourceUrl || '',
    source_label: model.sourceLabel || '',
  };

  if (includeGuide) response.guide = toGuideResponse(model);
  return response;
}

function toSupportAction(action = {}) {
  return {
    available: action.available === true,
    title: action.title || '',
    description: action.description || '',
    stage: action.stage || '',
    section_title: action.sectionTitle || '',
    warning: action.warning || '',
  };
}

function toSupportOptions(issue) {
  const options = issue?.supportOptions || {};
  return {
    recommended: {
      available: options.recommended?.available !== false,
      title: options.recommended?.title || 'Recommended troubleshooting',
      description:
        options.recommended?.description ||
        'Follow the complete receiver-specific guide in the recommended order.',
    },
    quick_restart: toSupportAction(options.quickRestart),
    factory_reset: toSupportAction(options.factoryReset),
  };
}

function toIssueResponse(modelId, issue) {
  const sections = Array.isArray(issue.sections) ? issue.sections : [];
  const stepCount = sections.reduce(
    (total, section) => total + (Array.isArray(section.steps) ? section.steps.length : 0),
    0
  );

  return {
    id: issue.id,
    model_id: modelId,
    title: issue.shortTitle,
    short_title: issue.shortTitle,
    description: issue.description,
    category: issue.category,
    error_code: getErrorCode(issue),
    keywords: Array.isArray(issue.keywords) ? issue.keywords : [],
    related_components: Array.isArray(issue.relatedComponents)
      ? issue.relatedComponents
      : [],
    video_guides: Array.isArray(issue.videoGuides)
      ? issue.videoGuides.map((video) => ({
          id: video.id,
          title: video.title,
          youtube_id: video.youtubeId,
          source: video.source || '',
          source_label: video.sourceLabel || '',
          verified: video.verified === true,
          coverage: video.coverage || 'full',
          type: video.type || (video.coverage === 'partial' ? 'supplemental' : 'full'),
          action: video.action || '',
          applicability: video.applicability || '',
          purpose: video.purpose || '',
          note: video.note || '',
        }))
      : [],
    support_options: toSupportOptions(issue),
    note: issue.note || '',
    section_count: sections.length,
    step_count: stepCount,
  };
}

function getModels(req, res) {
  return res.json({ models: boxModels.map((model) => toModelResponse(model)) });
}

function getIssuesByModel(req, res) {
  const model = findBoxModel(req.params.modelId);
  if (!model) return res.status(404).json({ error: 'Troubleshooting model not found' });

  return res.json({
    model: toModelResponse(model, { includeGuide: true }),
    issues: model.issues.map((issue) => toIssueResponse(model.id, issue)),
  });
}

function getStepsByIssue(req, res) {
  const issueId = String(req.params.issueId || '').trim();
  const modelId = String(req.query.modelId || '').trim();

  let model = modelId ? findBoxModel(modelId) : null;
  let issue = model ? findTroubleshootIssue(model.id, issueId) : null;

  if (!issue) {
    for (const candidateModel of boxModels) {
      const candidateIssue = findTroubleshootIssue(candidateModel.id, issueId);
      if (candidateIssue) {
        model = candidateModel;
        issue = candidateIssue;
        break;
      }
    }
  }

  if (!issue || !model) {
    return res.status(404).json({ error: 'Troubleshooting issue not found' });
  }

  let stepNumber = 0;
  const steps = [];
  issue.sections.forEach((section, sectionIndex) => {
    (section.steps || []).forEach((instruction, stepIndex) => {
      stepNumber += 1;
      steps.push({
        id: `${model.id}:${issue.id}:${sectionIndex + 1}:${stepIndex + 1}`,
        issue_id: issue.id,
        model_id: model.id,
        step_number: stepNumber,
        section_number: sectionIndex + 1,
        section_title: section.title,
        instruction,
      });
    });
  });

  return res.json({
    model: toModelResponse(model, { includeGuide: true }),
    issue: toIssueResponse(model.id, issue),
    note: issue.note || '',
    related_components: Array.isArray(issue.relatedComponents)
      ? issue.relatedComponents
      : [],
    steps,
  });
}

async function recordTroubleshootOutcome(req, res) {
  try {
    const {
      modelId,
      issueId,
      outcome,
      sessionId,
      supportMode,
      isFinal,
      videoWatched,
      stepsCompleted,
      totalSteps,
      lastStepId,
    } = req.body || {};

    const allowedOutcomes = new Set([
      'started',
      'viewed',
      'resolved',
      'unresolved',
      'ticket',
      'technician',
    ]);
    const allowedModes = new Set([
      'full',
      'quick_restart',
      'factory_reset',
      'video',
    ]);
    const normalizedOutcome = String(outcome || '').trim();
    const requestedMode = String(supportMode || '').trim();
    const normalizedMode = allowedModes.has(requestedMode) ? requestedMode : 'full';

    if (!modelId || !issueId || !allowedOutcomes.has(normalizedOutcome)) {
      return res.status(400).json({
        error: 'Valid modelId, issueId, and outcome are required.',
      });
    }

    const model = findBoxModel(modelId);
    const issue = model ? findTroubleshootIssue(model.id, issueId) : null;
    if (!model || !issue) {
      return res.status(404).json({ error: 'Troubleshooting guide not found.' });
    }

    const safeSessionId = String(sessionId || '').trim().slice(0, 80) || null;
    const safeLastStepId = String(lastStepId || '').trim().slice(0, 180) || null;
    const parsedStepsCompleted = Number(stepsCompleted || 0);
    const parsedTotalSteps = Number(totalSteps || 0);
    const safeStepsCompleted = Number.isFinite(parsedStepsCompleted)
      ? Math.max(0, Math.min(parsedStepsCompleted, 500))
      : 0;
    const safeTotalSteps = Number.isFinite(parsedTotalSteps)
      ? Math.max(0, Math.min(parsedTotalSteps, 500))
      : 0;

    const id = await recordOutcome({
      userId: req.user.id,
      accountNumber: req.user.accountNumber,
      location: req.user.location,
      modelId: model.id,
      modelName: model.name,
      issueId: issue.id,
      issueLabel: issue.shortTitle,
      outcome: normalizedOutcome,
      sessionId: safeSessionId,
      supportMode: normalizedMode,
      isFinal: isFinal !== false,
      videoWatched: videoWatched === true,
      stepsCompleted: safeStepsCompleted,
      totalSteps: safeTotalSteps,
      lastStepId: safeLastStepId,
    });

    return res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('RECORD TROUBLESHOOT OUTCOME ERROR:', error);
    return res.status(500).json({ error: 'Unable to save troubleshooting outcome.' });
  }
}

module.exports = {
  getModels,
  getIssuesByModel,
  getStepsByIssue,
  recordTroubleshootOutcome,
};
