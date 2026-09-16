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
  requestCustomerPhoneVerification,
  confirmCustomerPhoneVerification,
  customerRecoveryOptions,
  startCustomerEmailRecovery,
  completeCustomerEmailRecovery,
  startCustomerSmsRecovery,
  completeCustomerSmsRecovery,
  publicPrepaidInquiry,
  publicCcaInquiry,
  startPublicCcaRecovery,
  verifyPublicCcaRecovery,
  customerTermsStatus,
  acceptCustomerTerms,
  adminSecurityStatus,
  adminBootstrapStart,
  adminBootstrapComplete,
  adminLogin,
  adminSendTwoFactor,
  adminVerifyTwoFactor,
  adminRecoveryStart,
  adminRecoveryComplete,
  adminSecurityInfo,
  adminChangePassword,
  adminRegenerateRecoveryCodes,
  adminRevokeSessions,
  adminUpdateEmail,
  adminContactVerificationStart,
  adminContactVerificationConfirm,
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
  customerSmsRecoveryRateLimit,
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
router.post('/sms-recovery/start', customerSmsRecoveryRateLimit, startCustomerSmsRecovery);
router.post('/sms-recovery/complete', customerSmsRecoveryRateLimit, completeCustomerSmsRecovery);

// Privacy-safe public quick inquiries and Account Number recovery.
router.post('/public/prepaid-inquiry', accountInquiryRateLimit, publicPrepaidInquiry);
router.post('/public/cca-inquiry', accountInquiryRateLimit, publicCcaInquiry);
router.post('/public/cca-recovery/start', customerSmsRecoveryRateLimit, startPublicCcaRecovery);
router.post('/public/cca-recovery/verify', customerRecoveryRateLimit, verifyPublicCcaRecovery);

router.get('/customer/security', authRequired, requireRole('user'), customerSecurityInfo);
router.post('/customer/email/verification/request', authRequired, requireRole('user'), customerEmailRateLimit, requestCustomerEmailVerification);
router.post('/customer/email/verification/confirm', authRequired, requireRole('user'), customerEmailRateLimit, confirmCustomerEmailVerification);
router.post('/customer/phone/verification/request', authRequired, requireRole('user'), customerSmsRecoveryRateLimit, requestCustomerPhoneVerification);
router.post('/customer/phone/verification/confirm', authRequired, requireRole('user'), customerSmsRecoveryRateLimit, confirmCustomerPhoneVerification);
router.get('/customer/terms', authRequired, requireRole('user'), customerTermsStatus);
router.post('/customer/terms/accept', authRequired, requireRole('user'), acceptCustomerTerms);
router.get('/me', authRequired, me);
router.get('/lookup/:accountId', authRequired, requireRole('user'), accountInquiryRateLimit, lookupByAccountId);

// Admin authentication and recovery
router.get('/admin/security-status', adminSecurityStatus);
router.post('/admin/bootstrap/start', adminAuthRateLimit, adminBootstrapStart);
router.post('/admin/bootstrap/complete', adminAuthRateLimit, adminBootstrapComplete);
router.post('/admin/login', adminAuthRateLimit, adminLogin);
router.post('/admin/send-2fa', adminAuthRateLimit, adminSendTwoFactor);
router.post('/admin/verify-2fa', adminAuthRateLimit, adminVerifyTwoFactor);
router.post('/admin/recovery/start', adminAuthRateLimit, adminRecoveryStart);
router.post('/admin/recovery/complete', adminAuthRateLimit, adminRecoveryComplete);

// Authenticated admin security center
router.get('/admin/security', authRequired, requireRole('admin'), adminSecurityInfo);
router.post('/admin/security/change-password', authRequired, requireRole('admin'), adminChangePassword);
router.post('/admin/security/recovery-codes', authRequired, requireRole('admin'), adminRegenerateRecoveryCodes);
router.post('/admin/security/revoke-sessions', authRequired, requireRole('admin'), adminRevokeSessions);
router.put('/admin/security/recovery-email', authRequired, requireRole('admin'), adminUpdateEmail);
router.post('/admin/security/contact-verification/start', authRequired, requireRole('admin'), adminContactVerificationStart);
router.post('/admin/security/contact-verification/confirm', authRequired, requireRole('admin'), adminContactVerificationConfirm);
router.get('/admin/security/audit-logs', authRequired, requireRole('admin'), adminAuditLogs);

module.exports = router;
