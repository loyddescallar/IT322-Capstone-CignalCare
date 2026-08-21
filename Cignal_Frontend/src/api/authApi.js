import axiosClient from './axiosClient';

const authApi = {
  // Customer auth
  login: (data) => axiosClient.post('/auth/login', data),
  register: (data) => axiosClient.post('/auth/register', data),
  changePassword: (password, passwordChangeToken) =>
    axiosClient.post('/auth/change-password', { password }, {
      headers: { Authorization: `Bearer ${passwordChangeToken}` },
    }),
  recoverPassword: (data) => axiosClient.post('/auth/recover-password', data),
  me: () => axiosClient.get('/auth/me'),
  lookup: (id) => axiosClient.get('/auth/lookup/' + id),

  // Admin auth + security
  adminSecurityStatus: () => axiosClient.get('/auth/admin/security-status'),
  adminBootstrapStart: (data) => axiosClient.post('/auth/admin/bootstrap/start', data),
  adminBootstrapComplete: (data) => axiosClient.post('/auth/admin/bootstrap/complete', data),
  adminLogin: (data) => axiosClient.post('/auth/admin/login', data),
  adminVerifyTwoFactor: (data) => axiosClient.post('/auth/admin/verify-2fa', data),
  adminRecoveryStart: (data) => axiosClient.post('/auth/admin/recovery/start', data),
  adminRecoveryComplete: (data) => axiosClient.post('/auth/admin/recovery/complete', data),
  adminSecurityInfo: () => axiosClient.get('/auth/admin/security'),
  adminChangePassword: (data) => axiosClient.post('/auth/admin/security/change-password', data),
  adminRegenerateRecoveryCodes: (data) => axiosClient.post('/auth/admin/security/recovery-codes', data),
  adminRevokeSessions: (data) => axiosClient.post('/auth/admin/security/revoke-sessions', data),
  adminUpdateRecoveryEmail: (data) => axiosClient.put('/auth/admin/security/recovery-email', data),
  adminAuditLogs: () => axiosClient.get('/auth/admin/security/audit-logs'),
};

export default authApi;
