const express = require("express");
const router = express.Router();

const { register, login, me, lookupByAccountId } = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
router.get("/me", authRequired, me);

// GET /api/auth/account/:accountId  (lookup by accountNumber or CCA)
router.get("/account/:accountId", lookupByAccountId);

module.exports = router;
