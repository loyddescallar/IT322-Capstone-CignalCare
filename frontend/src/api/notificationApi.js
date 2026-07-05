import axios from "./axiosClient";

export const getMyNotifications = () =>
  axios.get("/notifications");

export const markAsRead = (id) =>
  axios.put(`/notifications/${id}`);