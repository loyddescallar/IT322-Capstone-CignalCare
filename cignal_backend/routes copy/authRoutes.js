const express = require('express');
const router = express.Router();
const { login, register, me, lookupByAccountId } = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');
router.post('/login',    login);
router.post('/register', register);
router.get('/me',        authRequired, me);
router.get('/lookup/:accountId', lookupByAccountId);
module.exports = router;
