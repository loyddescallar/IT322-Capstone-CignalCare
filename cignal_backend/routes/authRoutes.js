const express = require('express');
const router = express.Router();
const {
  login,
  register,
  changePassword,
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

// Customer authentication
router.post('/login', login);
router.post('/register', register);
router.post('/change-password', changePassword);
router.get('/me', authRequired, me);
router.get('/lookup/:accountId', lookupByAccountId);

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
