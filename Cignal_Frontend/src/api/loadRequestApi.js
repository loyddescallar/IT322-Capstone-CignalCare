import axiosClient from './axiosClient';

export const createLoadRequest = data => axiosClient.post('/load-requests', data);
export const createPayMongoCheckout = data => axiosClient.post('/load-requests/paymongo-checkout', data);
export const getMyLoadRequests = () => axiosClient.get('/load-requests/my');
export const getAllLoadRequests = () => axiosClient.get('/load-requests');
export const updateLoadStatus = (id, status, note) => axiosClient.patch('/load-requests/' + id, { status, admin_note: note });
