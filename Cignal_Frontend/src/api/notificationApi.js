import axiosClient from './axiosClient';

const notificationApi = {
  getMine: () => axiosClient.get('/notifications'),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
};

export default notificationApi;
