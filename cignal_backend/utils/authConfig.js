const LOCAL_DEVELOPMENT_SECRET = 'cignalcare-local-development-only';

function isProduction() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

function getJwtSecret() {
  const configuredSecret = String(process.env.JWT_SECRET || '').trim();

  if (configuredSecret) return configuredSecret;

  if (isProduction()) {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  return LOCAL_DEVELOPMENT_SECRET;
}

function getJwtExpiry() {
  return String(process.env.JWT_EXPIRES_IN || '8h').trim() || '8h';
}

module.exports = {
  getJwtSecret,
  getJwtExpiry,
  isProduction,
};
