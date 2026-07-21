import axiosClient from './axiosClient';

const troubleshootApi = {
  getModels: () => axiosClient.get('/troubleshoot/models'),
  getIssuesByModel: (modelId) =>
    axiosClient.get(`/troubleshoot/models/${encodeURIComponent(modelId)}/issues`),
  getStepsByIssue: (issueId, modelId) =>
    axiosClient.get(`/troubleshoot/issues/${encodeURIComponent(issueId)}/steps`, {
      params: modelId ? { modelId } : undefined,
    }),
};

export default troubleshootApi;
