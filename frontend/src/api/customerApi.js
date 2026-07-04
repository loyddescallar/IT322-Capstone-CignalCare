import axiosClient from "./axiosClient";

const customerApi = {
  getCustomers: () => axiosClient.get("/customers"),
  getCustomerLookup: (accountId) => axiosClient.get(`/customers/${accountId}`),
  createCustomer: (data) => axiosClient.post("/customers", data),
  updateCustomer: (id, data) => axiosClient.put(`/customers/id/${id}`, data),
  deleteCustomer: (id) => axiosClient.delete(`/customers/id/${id}`),
};

export default customerApi;
