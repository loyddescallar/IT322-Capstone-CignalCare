const DEFAULT_TERMS_VERSION = '2026-09-14';

function getCurrentTermsVersion() {
  const configured = String(process.env.TERMS_VERSION || '').trim();
  return configured || DEFAULT_TERMS_VERSION;
}

module.exports = {
  DEFAULT_TERMS_VERSION,
  getCurrentTermsVersion,
};
