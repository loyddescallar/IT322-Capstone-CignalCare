const express = require("express");
const router = express.Router();
const controller = require("../controllers/loadRequestController");
const { authRequired, requireRole } = require("../middleware/auth");

// User remote prepaid loading workflow
router.post("/", authRequired, controller.createLoadRequest);
router.get("/my", authRequired, controller.getMyLoadRequests);
router.get("/user/:userId", authRequired, controller.getUserLoadRequests);

// Admin review / verification workflow
router.get("/", authRequired, requireRole("admin"), controller.getAllLoadRequests);
router.put("/:id/status", authRequired, requireRole("admin"), controller.updateStatus);

module.exports = router;
