import axiosClient from './axiosClient';

const troubleshootApi = {
  getModels: () => axiosClient.get('/troubleshoot/models'),
  getIssuesByModel: (modelId) =>
    axiosClient.get(`/troubleshoot/models/${encodeURIComponent(modelId)}/issues`),
  getStepsByIssue: (issueId) =>
    axiosClient.get(`/troubleshoot/issues/${encodeURIComponent(issueId)}/steps`),
};

export default troubleshootApi;
