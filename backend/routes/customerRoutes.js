const express = require("express");
const router = express.Router();
const {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  deleteCustomerController,
} = require("../controllers/customerController");
const { authRequired, requireRole } = require("../middleware/auth");

// Stats endpoint (must be before /:accountId to avoid conflict)
router.get("/stats", authRequired, requireRole("admin"), getStats);

// List all customers
router.get("/", authRequired, requireRole("admin"), listCustomers);

// Create customer
router.post("/", authRequired, requireRole("admin"), createCustomerController);

// Get by numeric ID (for profile page)
router.get("/id/:id", authRequired, getCustomerById);

// Update by ID
router.put("/id/:id", authRequired, requireRole("admin"), updateCustomerController);

// Delete by ID
router.delete("/id/:id", authRequired, requireRole("admin"), deleteCustomerController);

// Lookup by accountNumber or ccaNumber
router.get("/:accountId", authRequired, getCustomerByAccount);

module.exports = router;
