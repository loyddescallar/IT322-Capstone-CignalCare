import axiosClient from "./axiosClient";

const loadAdminApi = {
  getAll: () => axiosClient.get("/load/admin"),
  create: (payload) => axiosClient.post("/load", payload),
};

export default loadAdminApi;
