'use strict';
/**
 * CignalCare+ Legacy Attachment Preflight, v1.0
 * READ-ONLY. No INSERT/UPDATE/DELETE, Cloudinary upload/rename/destroy, or file writes.
 * Install this file at cignal_backend/scripts/legacyAttachmentPreflight.cjs.
 * Run from cignal_backend: node scripts/legacyAttachmentPreflight.cjs --plan
 * Supports MySQL and the project's PostgreSQL adapter via ../config/db.js.
 * Never outputs customer IDs, public IDs, attachment URLs or credentials.
 */
const path = require('node:path');
const crypto = require('node:crypto');
const VALID_MIME = Object.freeze({
  'image/png': { ext: 'png', type: 'image' },
  'image/jpeg': { ext: 'jpg', type: 'image' },
  'application/pdf': { ext: 'pdf', type: 'raw' },
});

function parseLegacyAsset(url, cloudName) {
  if (typeof url !== 'string' || !cloudName || !/^[A-Za-z0-9_-]+$/.test(cloudName)) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com' ||
        u.port || u.username || u.password || u.search || u.hash) return null;
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length < 5 || segments[0] !== cloudName ||
        !['raw', 'image'].includes(segments[1]) || segments[2] !== 'upload' ||
        !/^v\d{9,}$/.test(segments[3])) return null;
    const filename = segments.slice(4).join('/');
    if (!/^[A-Za-z0-9_./-]{1,400}$/.test(filename) ||
        filename.startsWith('/') || filename.includes('..')) return null;
    const formatMatch = filename.match(/\.(png|jpe?g|pdf)$/i);
    if (!formatMatch) return null;
    const ext = formatMatch[1].toLowerCase().replace('jpeg', 'jpg');
    // Cloudinary raw public IDs INCLUDE the original file extension.
    const publicId = segments[1] === 'raw'
      ? filename
      : filename.slice(0, -formatMatch[0].length);
    if (!publicId) return null;
    return { publicId, ext, version: Number(segments[3].slice(1)), resourceType: segments[1] };
  } catch { return null; }
}

function classifyAsset(row, asset, parsed) {
  const mime = String(row.attachment_type || '').toLowerCase().trim();
  const expected = VALID_MIME[mime];
  if (!expected || !parsed) return 'MANUAL_URL_OR_MIME_REVIEW';
  if (parsed.ext !== expected.ext || parsed.resourceType !== expected.type) return 'TYPE_OR_EXTENSION_REVIEW';
  if (!asset || asset.public_id !== parsed.publicId ||
      asset.resource_type !== parsed.resourceType || asset.type !== 'upload') return 'IDENTITY_REVIEW';
  if (Number(asset.version) !== parsed.version) return 'VERSION_REVIEW';
  if (!(Number(asset.bytes) > 0 && Number(asset.bytes) <= 5 * 1024 * 1024)) return 'SIZE_REVIEW';
  const assetFormat = String(asset.format || '').toLowerCase().replace('jpeg', 'jpg');
  if (expected.type === 'image') {
    if (assetFormat !== expected.ext) return 'FORMAT_REVIEW';
    return 'IMAGE_CANDIDATE_FOR_GUARDED_MIGRATION';
  }
  // For raw PDF uploads, Cloudinary may not populate asset.format.
  // This is only an identity check, not a valid-PDF-content or delivery check.
  if (assetFormat && assetFormat !== 'pdf') return 'RAW_PDF_FORMAT_REVIEW';
  return 'RAW_PDF_IDENTITY_OK_DELIVERY_UNVERIFIED';
}

function group(rows) {
  const results = new Map();
  for (const row of rows) {
    const key = `${row.mime} | ${row.status}`;
    results.set(key, (results.get(key) || 0) + 1);
  }
  return [...results.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([classification, count]) => ({classification, count}));
}

async function run() {
  if (process.argv.length !== 3 || process.argv[2] !== '--plan') {
    console.error('READ-ONLY usage: node scripts/legacyAttachmentPreflight.cjs --plan');
    process.exitCode = 2;
    return;
  }
  require('dotenv').config({ path:path.join(__dirname, '..', '.env'), quiet:true, override:false });
  const env = process.env;
  const cloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
  if (!/^[A-Za-z0-9_-]+$/.test(cloudName) ||
      !String(env.CLOUDINARY_API_KEY || '').trim() ||
      !String(env.CLOUDINARY_API_SECRET || '').trim()) {
    console.error('PREFLIGHT BLOCKED: Cloudinary credentials missing or cloud name invalid.');
    process.exitCode = 1;
    return;
  }
  const db = require('../config/db');
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name:cloudName, api_key:env.CLOUDINARY_API_KEY,
    api_secret:env.CLOUDINARY_API_SECRET, secure:true,
  });
  try {
    // SELECT only. Use placeholders supported by project database adapter.
    const [rows] = await db.query(
      'SELECT id, attachment, attachment_type FROM ticket_messages WHERE attachment LIKE ?',
      ['https://res.cloudinary.com/%']
    );
    const seen = new Set();
    let duplicated = 0;
    const classifications = [];
    for (const row of rows) {
      const mime = String(row.attachment_type || 'unknown').toLowerCase();
      const hash = crypto.createHash('sha256').update(String(row.attachment)).digest('hex');
      if (seen.has(hash)) duplicated++;
      else seen.add(hash);
      const parsed = parseLegacyAsset(row.attachment, cloudName);
      let status = 'MANUAL_URL_OR_MIME_REVIEW';
      if (parsed) {
        try {
          // Admin API GET resource. This does NOT return asset bytes.
          const asset = await cloudinary.api.resource(parsed.publicId, {
            resource_type:parsed.resourceType, type:'upload'
          });
          status = classifyAsset(row, asset, parsed);
        } catch (err) {
          status = Number(err?.http_code) === 404
            ? 'CLOUDINARY_ASSET_NOT_FOUND'
            : 'CLOUDINARY_READ_ONLY_LOOKUP_FAILED';
        }
      }
      classifications.push({mime, status});
    }
    const counts = group(classifications);
    const readyImages = classifications.filter(r=>r.status==='IMAGE_CANDIDATE_FOR_GUARDED_MIGRATION').length;
    const pdfChecks = classifications.filter(r=>r.status==='RAW_PDF_IDENTITY_OK_DELIVERY_UNVERIFIED').length;
    const other = classifications.length - readyImages - pdfChecks;
    console.log('CIGNALCARE+ LEGACY ATTACHMENT PREFLIGHT — READ ONLY');
    console.log('Database driver:', String(env.DB_DRIVER || env.DB_TYPE || 'default').replace(/[^A-Za-z0-9_-]/g,'').slice(0,30));
    console.log('Legacy message references:', rows.length);
    console.log('Distinct legacy URLs:', seen.size);
    console.log('Duplicate references:', duplicated);
    console.table(counts);
    console.log('Migration candidate images:', readyImages);
    console.log('Raw PDF(s) requiring separate signed download test:', pdfChecks);
    console.log('Other cases requiring manual review:', other);
    console.log('NO-GO for automatic changes: this script intentionally has no apply mode.');
    console.log('NEXT: confirm production/staging inventory, offline DB backup, authenticated replacement and authorized download tests before approving any changes.');
  } catch (err) {
    // Do not print server/URL/SQL exception text; it may contain secrets.
    console.error('READ-ONLY PREFLIGHT FAILED. ERROR CODE:',
      String(err?.code || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g,'').slice(0,45));
    process.exitCode = 1;
  } finally {
    if (db && typeof db.end === 'function') {
      try { await db.end(); } catch { /* hide connection data */ }
    }
  }
}
if (require.main === module) run();
module.exports = { parseLegacyAsset, classifyAsset, group };
