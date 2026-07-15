import axiosClient from './axiosClient';

const loadAdminApi = {
  getAll: () => axiosClient.get('/load/admin'),
  create: (payload) => axiosClient.post('/load', payload),
  getPlans: (includeInactive = false) => axiosClient.get('/load/plans' + (includeInactive ? '?includeInactive=1' : '')),
  createPlan: (payload) => axiosClient.post('/load/plans', payload),
  updatePlan: (id, payload) => axiosClient.put('/load/plans/' + id, payload),
  deletePlan: (id) => axiosClient.delete('/load/plans/' + id),
  getTx: () => axiosClient.get('/load/prepaid-transactions'),
};

export default loadAdminApi;
