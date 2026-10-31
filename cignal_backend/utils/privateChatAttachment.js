// Ticket files are never supplied to clients as unprotected Cloudinary URLs.
// This module intentionally contains pure functions that can be tested without credentials.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const STORED_PREFIX = 'cld-auth-v1:';
const MIMES = Object.freeze({
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'application/pdf': 'pdf',
});

function inspectAttachmentBytes(bytes, declaredMime) {
  if (!Buffer.isBuffer(bytes)) return false;
  switch (String(declaredMime).toLowerCase()) {
    case 'application/pdf': return bytes.subarray(0,5).toString('ascii') === '%PDF-';
    case 'image/png': return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    case 'image/jpeg': return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case 'image/gif': return ['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString('ascii'));
    case 'image/webp': return bytes.subarray(0,4).toString('ascii') === 'RIFF' && bytes.subarray(8,12).toString('ascii') === 'WEBP';
    default: return false;
  }
}

function encodePrivateAttachment({ publicId, resourceType, format }) {
  const data = { p: String(publicId || ''), r: resourceType, f: String(format || '') };
  if (!isValidDescriptor(data)) throw new Error('Invalid protected attachment data.');
  return STORED_PREFIX + Buffer.from(JSON.stringify(data)).toString('base64url');
}
function isValidDescriptor(v) {
  return v && ['raw','image'].includes(v.r) &&
    typeof v.p === 'string' && /^[a-zA-Z0-9_./-]{1,400}$/.test(v.p) &&
    !v.p.includes('..') && !v.p.startsWith('/') &&
    typeof v.f === 'string' && /^(jpg|jpeg|png|gif|webp|pdf)$/i.test(v.f);
}
function decodePrivateAttachment(raw) {
  if (typeof raw !== 'string' || !raw.startsWith(STORED_PREFIX) || raw.length > 1024) return null;
  try {
    const payload = raw.slice(STORED_PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return isValidDescriptor(obj) ? obj : null;
  } catch { return null; }
}

function validLegacyCloudinaryUrl(raw, cloudName) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com' ||
        u.port || u.username || u.password || u.hash) return null;
    const name = String(cloudName || '').trim();
    if (!name || u.pathname.split('/')[1] !== name) return null;
    if (!/^\/[^/]+\/(raw|image)\/upload\//.test(u.pathname)) return null;
    return u.toString();
  } catch { return null; }
}

async function boundedFetch(url, { signal, fetchImpl = fetch } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' ||
      !['api.cloudinary.com', 'res.cloudinary.com'].includes(parsed.hostname) ||
      parsed.port || parsed.username || parsed.password) {
    throw new Error('Cloudinary attachment host not allowed.');
  }
  const response = await fetchImpl(parsed.toString(), { redirect: 'error', signal });
  if (!response.ok) {
    const error = new Error('Attachment provider rejected the file.');
    error.statusCode = response.status === 401 || response.status === 403 ? 424 : 502;
    throw error;
  }
  if (Number(response.headers.get('content-length') || 0) > MAX_ATTACHMENT_BYTES) {
    throw Object.assign(new Error('Attachment exceeds maximum size.'), {statusCode:413});
  }
  if (!response.body) throw Object.assign(new Error('Empty attachment response.'), {statusCode:502});
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTACHMENT_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('Attachment exceeds maximum size.'), {statusCode:413});
      }
      parts.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts, size);
}
module.exports = {
  MIMES, MAX_ATTACHMENT_BYTES, inspectAttachmentBytes, encodePrivateAttachment,
  decodePrivateAttachment, validLegacyCloudinaryUrl, boundedFetch,
};
