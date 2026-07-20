const express = require('express');
const router = express.Router();
const {
  addLoad,
  getMyLoadHistory,
  getAllLoadHistoryController,
  getPrepaidTransactionsController,
  getPlansController,
  createPlanController,
  updatePlanController,
  deletePlanController,
  updateLoadStatusController,
} = require('../controllers/loadController');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/plans', authRequired, getPlansController);
router.post('/plans', authRequired, requireRole('admin'), createPlanController);
router.put('/plans/:id', authRequired, requireRole('admin'), updatePlanController);
router.delete('/plans/:id', authRequired, requireRole('admin'), deletePlanController);

router.get('/prepaid-transactions', authRequired, requireRole('admin'), getPrepaidTransactionsController);
router.post('/', authRequired, requireRole('admin'), addLoad);
router.get('/my', authRequired, getMyLoadHistory);
router.get('/admin', authRequired, requireRole('admin'), getAllLoadHistoryController);
router.patch('/admin/:id', authRequired, requireRole('admin'), updateLoadStatusController);

module.exports = router;
