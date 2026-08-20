import axiosClient from './axiosClient';

const authApi = {
  login: (data) => axiosClient.post('/auth/login', data),
  register: (data) => axiosClient.post('/auth/register', data),
  changePassword: (password, passwordChangeToken) =>
    axiosClient.post('/auth/change-password', { password }, {
      headers: { Authorization: `Bearer ${passwordChangeToken}` },
    }),
  me: () => axiosClient.get('/auth/me'),
  lookup: (id) => axiosClient.get('/auth/lookup/' + id),
};

export default authApi;
