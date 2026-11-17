// Admin avatars are account-scoped and never published as public static assets.
// Explicit migration only; normal API requests perform no DDL.
const pool = require('../config/db');
const MAX_PHOTO_BYTES = 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
function verifyImage(bytes, mimeType) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  return false;
}
function validateProfilePhoto(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 1_400_000) throw new Error('Photo exceeds the 1 MB limit.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match || !ALLOWED_MIME.has(match[1].toLowerCase())) throw new Error('Only JPG, PNG and WEBP profile photos are allowed.');
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  const bytes = Buffer.from(base64,'base64');
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES || bytes.toString('base64') !== base64) throw new Error('Profile photo is invalid or exceeds 1 MB.');
  if (!verifyImage(bytes, mimeType)) throw new Error('Profile photo content does not match its file type.');
  return { mimeType, base64, bytes };
}
function schemaError(error) {
  if (error?.code === '42P01' || error?.code === 'ER_NO_SUCH_TABLE' || error?.errno === 1146 || /no such table/i.test(error?.message || '')) {
    const unavailable = new Error('Administrator profile photo storage is not configured. Apply the reviewed profile-photo migration first.');
    unavailable.code = 'ADMIN_PHOTO_SCHEMA_MISSING';
    unavailable.statusCode = 503;
    return unavailable;
  }
  return error;
}
async function findPhoto(userId) {
  try {
    const [rows] = await pool.query('SELECT mime_type, image_base64 FROM admin_profile_photos WHERE user_id = ? LIMIT 1', [userId]);
    return rows?.[0] || null;
  } catch (error) {
    if (schemaError(error).code === 'ADMIN_PHOTO_SCHEMA_MISSING') return null;
    throw error;
  }
}
async function writePhoto(userId, photo) {
  const sql = pool.driver === 'postgres'
    ? 'INSERT INTO admin_profile_photos (user_id, mime_type, image_base64, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET mime_type = EXCLUDED.mime_type, image_base64 = EXCLUDED.image_base64, updated_at = CURRENT_TIMESTAMP'
    : 'INSERT INTO admin_profile_photos (user_id, mime_type, image_base64) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), image_base64 = VALUES(image_base64), updated_at = CURRENT_TIMESTAMP';
  try { await pool.query(sql, [userId, photo.mimeType, photo.base64]); }
  catch (error) { throw schemaError(error); }
}
async function removePhoto(userId) {
  try { await pool.query('DELETE FROM admin_profile_photos WHERE user_id = ?', [userId]); }
  catch (error) { throw schemaError(error); }
}
module.exports = { MAX_PHOTO_BYTES, verifyImage, validateProfilePhoto, findPhoto, writePhoto, removePhoto };
