import axiosClient from './axiosClient';
export default {
  getAdminAnalytics: (params = {}) => axiosClient.get('/analytics/admin', { params }),
  getAdminAnalyticsExcel: (params = {}) => axiosClient.get('/analytics/admin', {
    params: { ...params, format: 'xlsx' },
    responseType: 'blob',
    timeout: 60000,
  }),
};
