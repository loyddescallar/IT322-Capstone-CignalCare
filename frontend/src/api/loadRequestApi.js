import axios from "./axiosClient";

export const createLoadRequest = (data) => axios.post("/load-requests", data);

export const getMyLoadRequests = (userId) => {
  if (userId) return axios.get(`/load-requests/user/${userId}`);
  return axios.get("/load-requests/my");
};

export const getAllLoadRequests = () => axios.get("/load-requests");

export const updateLoadStatus = (id, status, admin_note = "") =>
  axios.put(`/load-requests/${id}/status`, { status, admin_note });
