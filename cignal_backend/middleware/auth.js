const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getJwtSecret } = require('../utils/authConfig');
const { findSecurityByUserId, writeAudit } = require('../models/adminSecurityModel');
const { ensureAccountSchema } = require('../models/userModel');

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
    await ensureAccountSchema();
    const [rows] = await pool.query(
      `SELECT id, accountName, accountNumber, ccaNumber, role, location, status, auth_session_version
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.id]
    );

    const user = rows[0];

    if (!user || String(user.status || 'active').toLowerCase() !== 'active') {
      return res.status(401).json({ error: 'Account is unavailable' });
    }

    if (user.role === 'admin') {
      const security = await findSecurityByUserId(user.id);
      if (!security || !Boolean(security.totp_enabled)) {
        return res.status(401).json({ error: 'Secure admin authentication is required.' });
      }
      if (Number(payload.sessionVersion || 0) !== Number(security.session_version || 1)) {
        return res.status(401).json({ error: 'Admin session has been revoked. Please log in again.' });
      }
    } else if (user.role === 'user') {
      if (Number(payload.sessionVersion || 0) !== Number(user.auth_session_version || 1)) {
        return res.status(401).json({ error: 'Customer session has been revoked. Please log in again.' });
      }
    }

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

    if (user.role === 'admin' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const startedAt = Date.now();
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          writeAudit({
            userId: user.id,
            action: 'ADMIN_API_MUTATION',
            ipAddress: forwarded || req.ip || req.socket?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
            details: `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`,
          });
        }
      });
    }

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
