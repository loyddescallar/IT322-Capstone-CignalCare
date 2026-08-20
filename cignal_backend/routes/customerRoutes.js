const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  resetCredentialsController,
  previewImportController,
  importSubscribersController,
  archiveCustomerController,
  restoreCustomerController,
} = require('../controllers/customerController');
const { authRequired, requireRole } = require('../middleware/auth');

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || '').toLowerCase();
    if (!name.endsWith('.xlsx')) return cb(new Error('Only .xlsx Excel files are supported.'));
    return cb(null, true);
  },
});

router.get('/stats', authRequired, requireRole('admin'), getStats);
router.get('/', authRequired, requireRole('admin'), listCustomers);
router.post('/', authRequired, requireRole('admin'), createCustomerController);
router.post('/import/preview', authRequired, requireRole('admin'), spreadsheetUpload.single('file'), previewImportController);
router.post('/import', authRequired, requireRole('admin'), spreadsheetUpload.single('file'), importSubscribersController);
router.get('/id/:id', authRequired, getCustomerById);
router.put('/id/:id', authRequired, requireRole('admin'), updateCustomerController);
router.post('/id/:id/reset-credentials', authRequired, requireRole('admin'), resetCredentialsController);
router.patch('/id/:id/archive', authRequired, requireRole('admin'), archiveCustomerController);
router.patch('/id/:id/restore', authRequired, requireRole('admin'), restoreCustomerController);
router.get('/:accountId', authRequired, getCustomerByAccount);

module.exports = router;
