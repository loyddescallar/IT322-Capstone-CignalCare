import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const prepaidApi = {
  // USER SIDE: prepaid inquiry
  getInquiry(accountNumber) {
    return axios.get(`${API_BASE}/prepaid/inquiry/${accountNumber}`, {
      headers: getAuthHeaders(),
    });
  },

  // ADMIN POS SIDE: get all active prepaid plans
  getPlans() {
    return axios.get(`${API_BASE}/prepaid-pos/plans`, {
      headers: getAuthHeaders(),
    });
  },

  // ADMIN POS SIDE: search account by account number or CCA number
  getAccount(accountId) {
    return axios.get(`${API_BASE}/prepaid-pos/account/${accountId}`, {
      headers: getAuthHeaders(),
    });
  },

  // ADMIN POS SIDE: process prepaid load
  processLoad(payload) {
    return axios.post(`${API_BASE}/prepaid-pos/process`, payload, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
  },
};

export default prepaidApi;