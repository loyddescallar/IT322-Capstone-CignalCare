const express = require("express");
const router = express.Router();
const {
  addLoad,
  getMyLoadHistory,
  getAllLoadHistoryController,
  getPrepaidTransactionsController,
  getPlansController,
  updateLoadStatusController
} = require("../controllers/loadController");
const { authRequired, requireRole } = require("../middleware/auth");

// Plans (accessible to all logged-in users)
router.get("/plans", authRequired, getPlansController);

// Prepaid transactions (admin only)
router.get("/prepaid-transactions", authRequired, requireRole("admin"), getPrepaidTransactionsController);

// User routes
router.post("/", authRequired, addLoad);
router.get("/my", authRequired, getMyLoadHistory);

// Admin load history (POS loads)
router.get("/admin", authRequired, requireRole("admin"), getAllLoadHistoryController);
router.patch("/admin/:id", authRequired, requireRole("admin"), updateLoadStatusController);

module.exports = router;
