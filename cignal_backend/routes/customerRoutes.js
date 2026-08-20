const express = require('express');
const router = express.Router();
const {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  archiveCustomerController,
  restoreCustomerController,
} = require('../controllers/customerController');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/stats', authRequired, requireRole('admin'), getStats);
router.get('/', authRequired, requireRole('admin'), listCustomers);
router.post('/', authRequired, requireRole('admin'), createCustomerController);
router.get('/id/:id', authRequired, getCustomerById);
router.put('/id/:id', authRequired, requireRole('admin'), updateCustomerController);
router.patch('/id/:id/archive', authRequired, requireRole('admin'), archiveCustomerController);
router.patch('/id/:id/restore', authRequired, requireRole('admin'), restoreCustomerController);
router.get('/:accountId', authRequired, getCustomerByAccount);

module.exports = router;
