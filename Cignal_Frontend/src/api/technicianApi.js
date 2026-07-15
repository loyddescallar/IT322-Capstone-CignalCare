import axiosClient from './axiosClient';

const technicianApi = {
  createRequest: (data) => axiosClient.post('/technicians/requests', data),
  getMyRequests: () => axiosClient.get('/technicians/requests/my'),
  getAdminRequests: () => axiosClient.get('/technicians/requests/admin'),
  updateRequestStatus: (id, data) => axiosClient.patch('/technicians/requests/admin/' + id, data),
};

export default technicianApi;
