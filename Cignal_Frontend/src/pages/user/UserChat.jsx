import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import ChatAttachment from '../../components/ChatAttachment';
import ticketApi from '../../api/ticketApi';
import {
  formatChatTimestamp,
  getStoredChatUser,
  isOwnMessage,
  validateChatAttachment,
} from '../../utils/chatUtils';

const legacyStatusMap = {
  Open: 'Submitted',
  'In Progress': 'Under Review',
  Closed: 'Archived',
};

function displayStatus(status) {
  return legacyStatusMap[status] || status || 'Submitted';
}

function isFinished(status) {
  return ['Resolved', 'Archived'].includes(displayStatus(status));
}

export default function UserChat() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const currentUser = getStoredChatUser(false);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadMessages = async () => {
    try {
      const response = await ticketApi.getTicketMessages(ticketId);
      setMessages(response.data?.messages || []);
    } catch (loadError) {
      console.error('LOAD USER CHAT MESSAGES ERROR:', loadError);
    }
  };

  useEffect(() => {
    let active = true;

    ticketApi
      .getTicket(ticketId)
      .then((response) => {
        if (!active) return;
        const loadedTicket = response.data?.ticket || response.data;
        setTicket(
          loadedTicket
            ? { ...loadedTicket, status: displayStatus(loadedTicket.status) }
            : null
        );
      })
      .catch((loadError) => {
        console.error('LOAD USER TICKET ERROR:', loadError);
        if (active) setError('Unable to load this conversation.');
      });

    loadMessages();
    const interval = window.setInterval(loadMessages, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelection = (selectedFile) => {
    const validationError = validateChatAttachment(selectedFile);

    if (validationError) {
      setError(validationError);
      clearSelectedFile();
      return;
    }

    setError('');
    setFile(selectedFile || null);
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !file) || isFinished(ticket?.status) || sending) {
      return;
    }

    setSending(true);
    setError('');

    try {
      if (file) {
        await ticketApi.sendTicketAttachment(ticketId, {
          file,
          message: newMsg.trim(),
        });
      } else {
        await ticketApi.sendTicketMessage(ticketId, newMsg.trim());
      }

      setNewMsg('');
      clearSelectedFile();
      await loadMessages();
    } catch (sendError) {
      console.error('SEND USER CHAT MESSAGE ERROR:', sendError);
      setError(
        sendError.response?.data?.error ||
          'Unable to send your message. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const status = displayStatus(ticket?.status);

  return (
    <UserLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/user/tickets')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Back to tickets"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-800">
              {ticket?.subject || 'Loading...'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">#{ticketId}</span>
              {ticket?.status && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-xs text-gray-400">
              No messages yet.
            </p>
          ) : (
            messages.map((message, index) => {
              const mine = isOwnMessage(message, currentUser);
              const senderLabel = mine
                ? 'You'
                : message.sender_name || message.accountName || 'Support';

              return (
                <div
                  key={message.id || `${message.created_at}-${index}`}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  {!mine && (
                    <div className="mr-2 mt-5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-xs font-bold text-white">
                      S
                    </div>
                  )}

                  <div
                    className={`flex max-w-[75%] flex-col ${
                      mine ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="mb-1 px-1 text-[10px] font-semibold text-gray-400">
                      {senderLabel}
                    </span>

                    <div
                      className={`rounded-2xl px-4 py-3 text-xs shadow-sm ${
                        mine
                          ? 'rounded-br-sm bg-blue-600 text-white'
                          : 'rounded-bl-sm border border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      {message.message && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.message}
                        </p>
                      )}

                      {message.attachment && (
                        <ChatAttachment message={message} mine={mine} />
                      )}

                      <p
                        className={`mt-1 text-right ${
                          mine ? 'text-blue-200' : 'text-gray-400'
                        }`}
                        style={{ fontSize: '9px' }}
                      >
                        {formatChatTimestamp(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {!isFinished(status) && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
            {error && (
              <div className="mb-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            {file && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                <Paperclip size={12} className="text-blue-500" />
                <span className="flex-1 truncate text-xs text-blue-700">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-blue-400 hover:text-blue-600"
                  aria-label="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Attach a file"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0] || null)
                }
              />
              <input
                type="text"
                value={newMsg}
                onChange={(event) => setNewMsg(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs outline-none focus:border-[#cc0000]"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={(!newMsg.trim() && !file) || sending}
                className="rounded-xl bg-[#cc0000] px-4 py-2.5 text-white hover:bg-red-700 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}

        {isFinished(status) && (
          <div className="flex-shrink-0 border-t border-green-100 bg-green-50 px-4 py-3 text-center text-xs font-semibold text-green-700">
            ✅ This ticket is {status.toLowerCase()}.
          </div>
        )}
      </div>
    </UserLayout>
  );
}
