import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Paperclip,
  Send,
  Wrench,
  X,
} from 'lucide-react';
import ticketApi from '../../api/ticketApi';
import ChatAttachment from '../../components/ChatAttachment';
import {
  formatChatTimestamp,
  getStoredChatUser,
  isOwnMessage,
  validateChatAttachment,
} from '../../utils/chatUtils';

const STATUSES = [
  'Submitted',
  'Under Review',
  'Job Order Assigned',
  'Resolved',
  'Archived',
];

const legacyStatusMap = {
  Open: 'Submitted',
  'In Progress': 'Under Review',
  Closed: 'Archived',
};

const statusCfg = {
  Submitted: 'bg-red-100 text-red-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Job Order Assigned': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
  Archived: 'bg-slate-100 text-slate-600',
};

const statusIcon = {
  Submitted: <Flag size={10} className="text-red-500" />,
  'Under Review': <Clock size={10} className="text-amber-500" />,
  'Job Order Assigned': <Wrench size={10} className="text-blue-500" />,
  Resolved: <CheckCircle2 size={10} className="text-green-500" />,
  Archived: <Archive size={10} className="text-slate-400" />,
};

function displayStatus(status) {
  return legacyStatusMap[status] || status || 'Submitted';
}

function isFinished(status) {
  return ['Resolved', 'Archived'].includes(displayStatus(status));
}

export default function AdminChat() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const currentAdmin = getStoredChatUser(true);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    let adminUser = {};

    try {
      adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    } catch {
      adminUser = {};
    }

    if (!token || adminUser.role !== 'admin') {
      navigate('/admin-login', { replace: true });
    }
  }, [navigate]);

  const loadTicket = async () => {
    try {
      const response = await ticketApi.getTicket(ticketId);
      const loadedTicket = response.data?.ticket || response.data;
      setTicket(
        loadedTicket
          ? { ...loadedTicket, status: displayStatus(loadedTicket.status) }
          : null
      );
    } catch (loadError) {
      console.error('LOAD ADMIN TICKET ERROR:', loadError);
      setError('Unable to load this ticket.');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await ticketApi.getTicketMessages(ticketId);
      setMessages(response.data?.messages || []);
    } catch (loadError) {
      console.error('LOAD ADMIN CHAT MESSAGES ERROR:', loadError);
    }
  };

  useEffect(() => {
    loadTicket();
    loadMessages();

    const interval = window.setInterval(loadMessages, 3000);
    return () => window.clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      console.error('SEND ADMIN CHAT MESSAGE ERROR:', sendError);
      setError(
        sendError.response?.data?.error ||
          'Unable to send the message. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (nextStatus) => {
    if (updating || nextStatus === displayStatus(ticket?.status)) return;

    setUpdating(true);
    setError('');

    try {
      await ticketApi.updateTicketStatus(ticketId, nextStatus);
      setTicket((previous) =>
        previous ? { ...previous, status: nextStatus } : previous
      );
    } catch (updateError) {
      console.error('UPDATE ADMIN TICKET STATUS ERROR:', updateError);
      setError(
        updateError.response?.data?.error || 'Unable to update ticket status.'
      );
    } finally {
      setUpdating(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#cc0000] border-t-transparent" />
          <p className="text-sm">Loading ticket...</p>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  const status = displayStatus(ticket.status);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-0.5 flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-gray-400">
              #{ticket.id}
            </span>
            <span
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                statusCfg[status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {statusIcon[status]}
              {status}
            </span>
            {ticket.category && (
              <span className="text-xs text-gray-500">{ticket.category}</span>
            )}
          </div>

          <p className="mt-1 truncate text-sm font-bold leading-snug text-gray-800">
            {ticket.subject}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {ticket.accountName || ticket.user_id}{' '}
            {ticket.accountNumber ? `· ${ticket.accountNumber}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2">
        <p className="mr-1 text-xs text-gray-500">Update Status:</p>
        {STATUSES.map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            disabled={updating}
            onClick={() => updateStatus(statusOption)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === statusOption
                ? 'border-[#cc0000] bg-red-50 text-[#cc0000]'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {statusOption}
          </button>
        ))}
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-xs text-gray-400">
            No messages yet. Type a reply below.
          </p>
        ) : (
          messages.map((message, index) => {
            const mine = isOwnMessage(message, currentAdmin);
            const senderLabel = mine
              ? 'You (Admin)'
              : message.sender_name || message.accountName || 'Customer';
            const senderInitial = String(senderLabel || 'C')
              .charAt(0)
              .toUpperCase();

            return (
              <div
                key={message.id || `${message.created_at}-${index}`}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                {!mine && (
                  <div className="mr-2 mt-5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600">
                    {senderInitial}
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
                        ? 'rounded-br-sm bg-[#cc0000] text-white'
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
                        mine ? 'text-red-200' : 'text-gray-400'
                      }`}
                      style={{ fontSize: '9px' }}
                    >
                      {formatChatTimestamp(message.created_at)}
                    </p>
                  </div>
                </div>

                {mine && (
                  <div className="ml-2 mt-5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-xs font-bold text-white">
                    A
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        {isFinished(status) ? (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-center text-xs font-semibold text-green-700">
            ✅ This ticket is {status.toLowerCase()}. Replies are disabled.
          </div>
        ) : (
          <>
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
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
                placeholder="Type a reply..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs outline-none focus:border-[#cc0000]"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={(!newMsg.trim() && !file) || sending}
                className="flex-shrink-0 rounded-xl bg-[#cc0000] px-4 py-2.5 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
