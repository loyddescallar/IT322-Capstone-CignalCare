const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
]);

function safeFileName(originalName = 'attachment') {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'attachment';

  const random = crypto.randomBytes(6).toString('hex');
  return `${Date.now()}-${random}-${base}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    callback(null, safeFileName(file.originalname));
  },
});

function fileFilter(_req, file, callback) {
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (!allowedMimeTypes.has(mimeType) || !allowedExtensions.has(extension)) {
    return callback(
      new Error('Only JPG, PNG, GIF, WEBP, and PDF attachments are allowed.')
    );
  }

  return callback(null, true);
}

const uploadMessage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_ATTACHMENT_BYTES,
    files: 1,
    fields: 5,
  },
});

module.exports = uploadMessage;
module.exports.uploadDir = uploadDir;
module.exports.allowedMimeTypes = allowedMimeTypes;
module.exports.allowedExtensions = allowedExtensions;
module.exports.MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_BYTES;
module.exports.safeFileName = safeFileName;
