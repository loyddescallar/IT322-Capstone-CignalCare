const {
  boxModels,
  findBoxModel,
  findTroubleshootIssue,
} = require('../data/troubleshootData');

function getErrorCode(issue) {
  const title = String(issue?.shortTitle || '');
  return /^E\d/i.test(title) ? title : null;
}

function toModelResponse(model) {
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    image: model.image,
    description: `${model.type || 'Cignal'} receiver`,
    status: 'active',
    issue_count: Array.isArray(model.issues) ? model.issues.length : 0,
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
    note: issue.note || '',
    section_count: sections.length,
    step_count: stepCount,
  };
}

function getModels(req, res) {
  return res.json({ models: boxModels.map(toModelResponse) });
}

function getIssuesByModel(req, res) {
  const model = findBoxModel(req.params.modelId);

  if (!model) {
    return res.status(404).json({ error: 'Troubleshooting model not found' });
  }

  return res.json({
    model: toModelResponse(model),
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
    model: toModelResponse(model),
    issue: toIssueResponse(model.id, issue),
    note: issue.note || '',
    steps,
  });
}

module.exports = {
  getModels,
  getIssuesByModel,
  getStepsByIssue,
};
