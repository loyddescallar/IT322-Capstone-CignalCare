// src/api/authApi.js
import axiosClient from "./axiosClient";

const authApi = {
  // Register new customer account
  register: (info) => axiosClient.post("/auth/register", info),

  // Login with accountName + accountId (accountNumber or ccaNumber)
  login: (credentials) => axiosClient.post("/auth/login", credentials),

  // Get currently authenticated user (based on JWT token)
  getUser: () => axiosClient.get("/auth/me"),

  // Public lookup by account number or CCA number
  lookupAccount: (accountId) => axiosClient.get(`/auth/account/${accountId}`),
};

export default authApi;
