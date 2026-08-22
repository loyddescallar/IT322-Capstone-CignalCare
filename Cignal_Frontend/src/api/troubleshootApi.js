import axiosClient from './axiosClient';

const troubleshootApi = {
  getModels: function () {
    return axiosClient.get('/troubleshoot/models');
  },

  getIssuesByModel: function (modelId) {
    const safeModelId = encodeURIComponent(String(modelId));

    return axiosClient.get(
      '/troubleshoot/models/' + safeModelId + '/issues'
    );
  },

  getStepsByIssue: function (issueId, modelId) {
    const safeIssueId = encodeURIComponent(String(issueId));

    const config = {};

    if (modelId) {
      config.params = {
        modelId: modelId,
      };
    }

    return axiosClient.get(
      '/troubleshoot/issues/' + safeIssueId + '/steps',
      config
    );
  },

  recordOutcome: function (payload) {
    return axiosClient.post('/troubleshoot/outcomes', payload);
  },
};

export default troubleshootApi;