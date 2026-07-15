import axiosClient from './axiosClient';

const notificationApi = {
  getMine: () => axiosClient.get('/notifications'),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
};

export default notificationApi;
