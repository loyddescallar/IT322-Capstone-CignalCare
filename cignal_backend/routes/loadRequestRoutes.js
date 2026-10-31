const express = require('express');
const router = express.Router();
const {
  createLoadRequestController,
  createPayMongoCheckoutController,
  getMyLoadRequestsController,
  getAllLoadRequestsController,
  updateLoadStatusController,
} = require('../controllers/loadRequestController');
const { authRequired, requireRole } = require('../middleware/auth');
const { createAbuseRateLimit } = require('../middleware/abuseRateLimit');

router.post('/', authRequired, createAbuseRateLimit('manualLoad'), createLoadRequestController);
router.post('/paymongo-checkout', authRequired, createAbuseRateLimit('checkout'), createPayMongoCheckoutController);
router.get('/my', authRequired, getMyLoadRequestsController);
router.get('/', authRequired, requireRole('admin'), getAllLoadRequestsController);
router.patch('/:id', authRequired, requireRole('admin'), updateLoadStatusController);

module.exports = router;
