const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const MAX_UPLOAD_BYTES = Number(process.env.CLOUDINARY_MAX_UPLOAD_MB || 5) * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const RAW_MIME_TYPES = new Set(['application/pdf']);

let configured = false;
let warnedMissingCredentials = false;

function getCloudinaryCredentials() {
  return {
    cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: String(process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: String(process.env.CLOUDINARY_API_SECRET || '').trim(),
  };
}

function isCloudinaryConfigured() {
  const credentials = getCloudinaryCredentials();
  return Boolean(credentials.cloud_name && credentials.api_key && credentials.api_secret);
}

function ensureCloudinaryConfigured() {
  if (!isCloudinaryConfigured()) {
    if (!warnedMissingCredentials) {
      console.warn(
        'CLOUDINARY DISABLED: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing. Local/base64 fallback remains active.'
      );
      warnedMissingCredentials = true;
    }
    return false;
  }

  if (!configured) {
    cloudinary.config({
      ...getCloudinaryCredentials(),
      secure: true,
    });
    configured = true;
  }

  return true;
}

function isDataUrl(value) {
  return typeof value === 'string' && /^data:[^;]+;base64,/i.test(value);
}

function isRemoteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function parseDataUrl(dataUrl) {
  if (!isDataUrl(dataUrl)) return null;

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/is);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, '');
  const sizeBytes = Math.floor((base64.length * 3) / 4);

  return { mimeType, base64, sizeBytes };
}

function assertAllowedUpload({ mimeType, sizeBytes, allowPdf = false }) {
  const allowed = IMAGE_MIME_TYPES.has(mimeType) || (allowPdf && RAW_MIME_TYPES.has(mimeType));

  if (!allowed) {
    throw new Error(
      allowPdf
        ? 'Only JPG, PNG, GIF, WEBP, and PDF files are allowed.'
        : 'Only JPG, PNG, GIF, and WEBP images are allowed.'
    );
  }

  if (Number(sizeBytes) > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`);
  }
}

function sanitizeFolder(folder) {
  const cleaned = String(folder || 'cignalcare/uploads')
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '');

  return cleaned || 'cignalcare/uploads';
}

function getImageUploadOptions(folder) {
  return {
    folder: sanitizeFolder(folder),
    resource_type: 'image',
    unique_filename: true,
    overwrite: false,
    use_filename: true,
    transformation: [
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: 'auto:good' },
    ],
  };
}

function getRawUploadOptions(folder) {
  return {
    folder: sanitizeFolder(folder),
    resource_type: 'raw',
    unique_filename: true,
    overwrite: false,
    use_filename: true,
  };
}

async function removeLocalFileQuietly(filePath) {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('LOCAL UPLOAD CLEANUP WARNING:', error.message);
    }
  }
}

async function uploadImageMaybe(dataUrlOrUrl, folder = 'cignalcare/uploads') {
  if (!dataUrlOrUrl) return null;
  if (isRemoteUrl(dataUrlOrUrl)) return dataUrlOrUrl;
  if (!isDataUrl(dataUrlOrUrl)) return dataUrlOrUrl;

  const parsed = parseDataUrl(dataUrlOrUrl);
  if (!parsed) return dataUrlOrUrl;

  assertAllowedUpload({
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
    allowPdf: false,
  });

  if (!ensureCloudinaryConfigured()) {
    return dataUrlOrUrl;
  }

  try {
    const result = await cloudinary.uploader.upload(
      dataUrlOrUrl,
      getImageUploadOptions(folder)
    );

    return result.secure_url || result.url || dataUrlOrUrl;
  } catch (error) {
    console.error('CLOUDINARY DATA-URL UPLOAD FAILED:', error.message);
    return dataUrlOrUrl;
  }
}

async function uploadLocalFileMaybe(file, folder = 'cignalcare/chat') {
  if (!file?.path) {
    return {
      url: null,
      storage: 'none',
      publicId: null,
      resourceType: null,
    };
  }

  const stats = await fs.promises.stat(file.path);
  const mimeType = String(file.mimetype || '').toLowerCase();
  const allowPdf = RAW_MIME_TYPES.has(mimeType);

  assertAllowedUpload({
    mimeType,
    sizeBytes: stats.size,
    allowPdf: true,
  });

  const localFallback = file.filename || path.basename(file.path);

  if (!ensureCloudinaryConfigured()) {
    return {
      url: localFallback,
      storage: 'local',
      publicId: null,
      resourceType: allowPdf ? 'raw' : 'image',
    };
  }

  try {
    const options = allowPdf
      ? getRawUploadOptions(folder)
      : getImageUploadOptions(folder);

    const result = await cloudinary.uploader.upload(file.path, options);
    await removeLocalFileQuietly(file.path);

    return {
      url: result.secure_url || result.url,
      storage: 'cloudinary',
      publicId: result.public_id || null,
      resourceType: result.resource_type || options.resource_type,
      bytes: result.bytes || stats.size,
      format: result.format || null,
    };
  } catch (error) {
    console.error('CLOUDINARY LOCAL-FILE UPLOAD FAILED:', error.message);

    return {
      url: localFallback,
      storage: 'local',
      publicId: null,
      resourceType: allowPdf ? 'raw' : 'image',
      error: error.message,
    };
  }
}

async function deleteCloudinaryAssetMaybe(publicId, resourceType = 'image') {
  if (!publicId || !ensureCloudinaryConfigured()) return false;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    return true;
  } catch (error) {
    console.warn('CLOUDINARY CLEANUP WARNING:', error.message);
    return false;
  }
}

module.exports = {
  MAX_UPLOAD_BYTES,
  IMAGE_MIME_TYPES,
  RAW_MIME_TYPES,
  isCloudinaryConfigured,
  uploadImageMaybe,
  uploadLocalFileMaybe,
  deleteCloudinaryAssetMaybe,
  removeLocalFileQuietly,
};
