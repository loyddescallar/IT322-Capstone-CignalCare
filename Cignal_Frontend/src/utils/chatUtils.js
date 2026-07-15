export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const CHAT_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

export function getStoredChatUser(preferAdmin = false) {
  const keys = preferAdmin ? ['adminUser', 'user'] : ['user', 'adminUser'];

  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value && typeof value === 'object') return value;
    } catch {
      // Ignore malformed stale localStorage data and try the next key.
    }
  }

  return {};
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

export function isOwnMessage(message, currentUser) {
  if ([true, 1, '1'].includes(message?.is_mine)) return true;
  if ([false, 0, '0'].includes(message?.is_mine)) return false;

  const senderId = normalizeId(message?.sender_id);
  const currentUserId = normalizeId(currentUser?.id);

  if (senderId && currentUserId) {
    return senderId === currentUserId;
  }

  const senderRole = normalizeRole(message?.sender_role);
  const currentRole = normalizeRole(currentUser?.role);

  return Boolean(senderRole && currentRole && senderRole === currentRole);
}

export function isImageAttachment(message) {
  const mimeType = String(message?.attachment_type || '').toLowerCase();
  if (mimeType.startsWith('image/')) return true;

  const attachment = String(message?.attachment || '').split('?')[0];

  if (/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(attachment)) {
    return true;
  }

  return (
    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment) ||
    attachment.startsWith('data:image')
  );
}

export function formatChatTimestamp(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split('.')[0];

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function validateChatAttachment(file) {
  if (!file) return '';

  if (!CHAT_ATTACHMENT_TYPES.has(file.type)) {
    return 'Only JPG, PNG, GIF, WEBP, and PDF attachments are allowed.';
  }

  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return 'Attachment must be 5MB or smaller.';
  }

  return '';
}
