const express = require("express");
const router = express.Router();

const {
  createTechnicianRequest,
  getMyTechnicianRequests,
  getAllTechnicianRequests,
  updateTechnicianRequestStatus
} = require("../controllers/technicianController");

const { authRequired, requireRole } = require("../middleware/auth");

// User routes
router.post("/requests", authRequired, createTechnicianRequest);
router.get("/requests/my", authRequired, getMyTechnicianRequests);

// Admin routes
router.get("/requests/admin", authRequired, requireRole("admin"), getAllTechnicianRequests);
router.patch("/requests/admin/:id", authRequired, requireRole("admin"), updateTechnicianRequestStatus);

module.exports = router;
