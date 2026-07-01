import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

const prepaidApi = {
  getInquiry(accountNumber) {
    return axios.get(`${API_BASE}/prepaid/inquiry/${accountNumber}`);
  },

  getPlans() {
    const token = localStorage.getItem("token");
    return axios.get(`${API_BASE}/prepaid-pos/plans`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  },

  getAccount(accountId) {
    const token = localStorage.getItem("token");
    return axios.get(`${API_BASE}/prepaid-pos/account/${accountId}`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  },

  processLoad(payload) {
    const token = localStorage.getItem("token");
    return axios.post(`${API_BASE}/prepaid-pos/process`, payload, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : {
            "Content-Type": "application/json",
          },
    });
  },
};

export default prepaidApi;