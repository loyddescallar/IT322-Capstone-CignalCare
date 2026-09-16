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
  recoveryOptions: (data) => axiosClient.post('/auth/recovery-options', data),
  startEmailRecovery: (data) => axiosClient.post('/auth/email-recovery/start', data),
  completeEmailRecovery: (data) => axiosClient.post('/auth/email-recovery/complete', data),
  startSmsRecovery: (data) => axiosClient.post('/auth/sms-recovery/start', data),
  completeSmsRecovery: (data) => axiosClient.post('/auth/sms-recovery/complete', data),
  customerSecurityInfo: () => axiosClient.get('/auth/customer/security'),
  requestEmailVerification: (data) => axiosClient.post('/auth/customer/email/verification/request', data),
  confirmEmailVerification: (data) => axiosClient.post('/auth/customer/email/verification/confirm', data),
  requestPhoneVerification: (data) => axiosClient.post('/auth/customer/phone/verification/request', data),
  confirmPhoneVerification: (data) => axiosClient.post('/auth/customer/phone/verification/confirm', data),
  me: () => axiosClient.get('/auth/me'),
  lookup: (id) => axiosClient.get('/auth/lookup/' + id),
  prepaidInquiry: (data) => axiosClient.post('/auth/public/prepaid-inquiry', data),
  ccaInquiry: (data) => axiosClient.post('/auth/public/cca-inquiry', data),
  startCcaRecovery: (data) => axiosClient.post('/auth/public/cca-recovery/start', data),
  verifyCcaRecovery: (data) => axiosClient.post('/auth/public/cca-recovery/verify', data),
  customerTerms: () => axiosClient.get('/auth/customer/terms'),
  acceptCustomerTerms: () => axiosClient.post('/auth/customer/terms/accept', { accepted: true }),

  // Admin auth + security
  adminSecurityStatus: () => axiosClient.get('/auth/admin/security-status'),
  adminBootstrapStart: (data) => axiosClient.post('/auth/admin/bootstrap/start', data),
  adminBootstrapComplete: (data) => axiosClient.post('/auth/admin/bootstrap/complete', data),
  adminLogin: (data) => axiosClient.post('/auth/admin/login', data),
  adminSendTwoFactor: (data) => axiosClient.post('/auth/admin/send-2fa', data),
  adminVerifyTwoFactor: (data) => axiosClient.post('/auth/admin/verify-2fa', data),
  adminRecoveryStart: (data) => axiosClient.post('/auth/admin/recovery/start', data),
  adminRecoveryComplete: (data) => axiosClient.post('/auth/admin/recovery/complete', data),
  adminSecurityInfo: () => axiosClient.get('/auth/admin/security'),
  adminChangePassword: (data) => axiosClient.post('/auth/admin/security/change-password', data),
  adminRegenerateRecoveryCodes: (data) => axiosClient.post('/auth/admin/security/recovery-codes', data),
  adminRevokeSessions: (data) => axiosClient.post('/auth/admin/security/revoke-sessions', data),
  adminUpdateRecoveryEmail: (data) => axiosClient.put('/auth/admin/security/recovery-email', data),
  adminContactVerificationStart: (data) => axiosClient.post('/auth/admin/security/contact-verification/start', data),
  adminContactVerificationConfirm: (data) => axiosClient.post('/auth/admin/security/contact-verification/confirm', data),
  adminAuditLogs: () => axiosClient.get('/auth/admin/security/audit-logs'),
};

export default authApi;
