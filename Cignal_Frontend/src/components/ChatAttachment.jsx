import { useState } from 'react';
import { ExternalLink, ImageOff, Paperclip } from 'lucide-react';
import { getAttachmentUrl } from '../api/axiosClient';
import { isImageAttachment } from '../utils/chatUtils';

export default function ChatAttachment({
  message,
  mine = false,
  compact = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const attachmentUrl = getAttachmentUrl(message?.attachment);

  if (!attachmentUrl) return null;

  const linkClasses = mine
    ? 'text-white/80 hover:text-white'
    : 'text-blue-600 hover:text-blue-700';

  if (!isImageAttachment(message)) {
    return (
      <a
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 flex items-center gap-1 underline ${linkClasses}`}
        style={{ fontSize: compact ? '10px' : '11px' }}
      >
        <Paperclip size={compact ? 10 : 11} />
        Open attachment
      </a>
    );
  }

  if (imageFailed) {
    return (
      <div
        className={`mt-2 rounded-xl border p-3 ${
          mine
            ? 'border-white/20 bg-white/10'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <ImageOff size={compact ? 14 : 16} className="flex-shrink-0" />
          <p style={{ fontSize: compact ? '10px' : '11px' }}>
            Image preview could not be loaded.
          </p>
        </div>

        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2 flex items-center gap-1 underline ${linkClasses}`}
          style={{ fontSize: compact ? '10px' : '11px' }}
        >
          <ExternalLink size={compact ? 10 : 11} />
          Open image directly
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => window.open(attachmentUrl, '_blank', 'noopener,noreferrer')}
        className="block max-w-full overflow-hidden rounded-xl"
        title="Open image"
      >
        <img
          src={attachmentUrl}
          alt="Chat attachment"
          loading="lazy"
          className={`max-w-full object-contain ${
            compact ? 'max-h-40 rounded-lg' : 'max-h-72 rounded-xl'
          }`}
          onError={() => setImageFailed(true)}
        />
      </button>

      <a
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-1 flex items-center gap-1 underline ${linkClasses}`}
        style={{ fontSize: compact ? '9px' : '10px' }}
      >
        <ExternalLink size={compact ? 9 : 10} />
        Open full image
      </a>
    </div>
  );
}
