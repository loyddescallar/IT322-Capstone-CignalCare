const express = require('express');
const router = express.Router();
const {
  login,
  register,
  changePassword,
  recoverCustomerPassword,
  customerSecurityInfo,
  requestCustomerEmailVerification,
  confirmCustomerEmailVerification,
  customerRecoveryOptions,
  startCustomerEmailRecovery,
  completeCustomerEmailRecovery,
  adminSecurityStatus,
  adminBootstrapStart,
  adminBootstrapComplete,
  adminLogin,
  adminVerifyTwoFactor,
  adminRecoveryStart,
  adminRecoveryComplete,
  adminSecurityInfo,
  adminChangePassword,
  adminRegenerateRecoveryCodes,
  adminRevokeSessions,
  adminUpdateEmail,
  adminAuditLogs,
  me,
  lookupByAccountId,
} = require('../controllers/authController');
const { authRequired, requireRole } = require('../middleware/auth');
const adminAuthRateLimit = require('../middleware/adminAuthRateLimit');
const {
  customerLoginRateLimit,
  passwordChangeRateLimit,
  accountInquiryRateLimit,
  customerRecoveryRateLimit,
  customerEmailRateLimit,
} = require('../middleware/publicAuthRateLimit');

// Authentication responses can contain tokens, setup secrets, or one-time codes.
// Prevent browsers/proxies from caching any response under /api/auth.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Customer authentication
router.post('/login', customerLoginRateLimit, login);
router.post('/register', register);
router.post('/change-password', passwordChangeRateLimit, changePassword);
router.post('/recover-password', customerRecoveryRateLimit, recoverCustomerPassword);
router.post('/recovery-options', customerRecoveryRateLimit, customerRecoveryOptions);
router.post('/email-recovery/start', customerEmailRateLimit, startCustomerEmailRecovery);
router.post('/email-recovery/complete', customerEmailRateLimit, completeCustomerEmailRecovery);
router.get('/customer/security', authRequired, requireRole('user'), customerSecurityInfo);
router.post('/customer/email/verification/request', authRequired, requireRole('user'), customerEmailRateLimit, requestCustomerEmailVerification);
router.post('/customer/email/verification/confirm', authRequired, requireRole('user'), customerEmailRateLimit, confirmCustomerEmailVerification);
router.get('/me', authRequired, me);
router.get('/lookup/:accountId', accountInquiryRateLimit, lookupByAccountId);

// Admin authentication and recovery
router.get('/admin/security-status', adminSecurityStatus);
router.post('/admin/bootstrap/start', adminAuthRateLimit, adminBootstrapStart);
router.post('/admin/bootstrap/complete', adminAuthRateLimit, adminBootstrapComplete);
router.post('/admin/login', adminAuthRateLimit, adminLogin);
router.post('/admin/verify-2fa', adminAuthRateLimit, adminVerifyTwoFactor);
router.post('/admin/recovery/start', adminAuthRateLimit, adminRecoveryStart);
router.post('/admin/recovery/complete', adminAuthRateLimit, adminRecoveryComplete);

// Authenticated admin security center
router.get('/admin/security', authRequired, requireRole('admin'), adminSecurityInfo);
router.post('/admin/security/change-password', authRequired, requireRole('admin'), adminChangePassword);
router.post('/admin/security/recovery-codes', authRequired, requireRole('admin'), adminRegenerateRecoveryCodes);
router.post('/admin/security/revoke-sessions', authRequired, requireRole('admin'), adminRevokeSessions);
router.put('/admin/security/recovery-email', authRequired, requireRole('admin'), adminUpdateEmail);
router.get('/admin/security/audit-logs', authRequired, requireRole('admin'), adminAuditLogs);

module.exports = router;
