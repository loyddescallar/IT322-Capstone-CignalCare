const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getJwtSecret } = require('../utils/authConfig');

async function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const [rows] = await pool.query(
      `SELECT id, accountName, accountNumber, ccaNumber, role, location, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.id]
    );

    const user = rows[0];

    if (!user || String(user.status || 'active').toLowerCase() !== 'active') {
      return res.status(401).json({ error: 'Account is unavailable' });
    }

    // Use current database values so role, ownership, and account changes take
    // effect immediately instead of waiting for the JWT to expire.
    req.user = {
      ...payload,
      id: user.id,
      accountName: user.accountName,
      accountNumber: user.accountNumber,
      ccaNumber: user.ccaNumber,
      role: user.role,
      location: user.location,
      status: user.status,
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.error('AUTH MIDDLEWARE ERROR:', error.message);
    return res.status(500).json({ error: 'Unable to verify session' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    return next();
  };
}

module.exports = { authRequired, requireRole };
