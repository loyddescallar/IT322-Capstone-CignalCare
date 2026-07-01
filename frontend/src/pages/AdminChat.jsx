// src/pages/AdminChat.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ticketApi from "../api/ticketApi";
import TypingIndicator from "../components/TypingIndicator";
import axiosClient from "../api/axiosClient";

export default function AdminChat() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState({ user: false, admin: false });

  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const apiBase = axiosClient.defaults.baseURL || "";
  const fileBaseUrl = apiBase.replace(/\/api\/?$/, "");

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll tracking for floating button
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 80;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setShowScrollButton(!atBottom);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => scrollToBottom(), [messages]);

  // Load ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await ticketApi.getTicket(ticketId);
        setTicket(res.data.ticket || res.data);
      } catch (err) {
        console.error("ADMIN LOAD TICKET ERROR:", err);
        setError(err.response?.data?.error || "Failed to load ticket details.");
      } finally {
        setLoadingTicket(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // Load messages and typing
  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      try {
        const res = await ticketApi.getTicketMessages(ticketId);
        if (!active) return;
        setMessages(res.data.messages || []);
        setTyping(res.data.typing || { user: false, admin: false });
      } catch {
        if (active) setError(err.response?.data?.error || "Failed to load messages.");
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ticketId]);

  // Sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachmentFile) return;

    setSending(true);
    setError("");

    try {
      if (attachmentFile) {
        setUploading(true);
        await ticketApi.sendTicketAttachment(ticketId, {
          file: attachmentFile,
          message: newMessage,
        });
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setUploading(false);
      } else {
        await ticketApi.sendTicketMessage(ticketId, newMessage);
      }

      ticketApi.sendAdminTyping(ticketId, false);
      setNewMessage("");

      const refresh = await ticketApi.getTicketMessages(ticketId);
      setMessages(refresh.data.messages || []);
      scrollToBottom();
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Admin typing
  const handleTyping = (value) => {
    setNewMessage(value);

    ticketApi.sendAdminTyping(ticketId, true);
    clearTimeout(window.adminTypingTimeout);
    window.adminTypingTimeout = setTimeout(() => {
      ticketApi.sendAdminTyping(ticketId, false);
    }, 1800);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  if (loadingTicket)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading ticket...
      </div>
    );

  if (!isAdmin)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-600">
        <p className="mb-4">Admins only.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-cignalRed text-white rounded"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slideDown">
          <div>
            <p className="text-xs uppercase text-cignalRed tracking-[0.2em]">
              Ticket #{ticket.id}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {ticket.subject}
            </h1>
            <p className="text-sm text-slate-600">
              Category:{" "}
              <span className="font-semibold">{ticket.category}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              You are replying as <span className="font-semibold">Admin</span>.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-full border border-slate-300 text-xs hover:bg-slate-100 transition"
          >
            ← Back
          </button>
        </div>

        {/* RED DIVIDER */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60" />

        {/* CHAT AREA */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 flex flex-col h-[70vh] max-h-[620px]">

          {/* CHAT MESSAGES */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto space-y-3 pr-1"
          >
            {loadingMessages ? (
              <p className="text-xs text-slate-500">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-500">
                No messages yet. Start the conversation below.
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_role === "admin";

                const attachmentUrl =
                  msg.attachment && `${fileBaseUrl}/uploads/messages/${msg.attachment}`;
                const isImage =
                  msg.attachment_type?.startsWith("image/");

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-md animate-bubblePop
                        ${
                          isMine
                            ? "bg-cignalRed text-white rounded-br-none animate-slideRight"
                            : "bg-slate-200 text-slate-900 rounded-bl-none animate-slideLeft"
                        }`}
                    >
                      {msg.message && (
                        <p className="break-words whitespace-pre-wrap leading-snug">
                          {msg.message}
                        </p>
                      )}

                      {attachmentUrl && (
                        <div className="mt-2">
                          {isImage ? (
                            <img
                              src={attachmentUrl}
                              className="rounded-lg max-h-48 border"
                            />
                          ) : (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              className="text-[11px] underline"
                            >
                              Download File
                            </a>
                          )}
                        </div>
                      )}

                      <p
                        className={`mt-1 text-[10px] ${
                          isMine ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {typing.user && (
              <TypingIndicator who="User is typing..." />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SCROLL TO BOTTOM BUTTON */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute right-6 bottom-28 bg-cignalRed text-white text-[11px] px-3 py-1 rounded-full shadow hover:bg-red-700 transition"
            >
              ↓ New messages
            </button>
          )}

          {/* ATTACHMENT PREVIEW */}
          {attachmentPreview && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
              <img
                src={attachmentPreview}
                className="h-10 w-10 rounded border object-cover"
              />
              <span>Attachment ready</span>
              <button
                onClick={() => {
                  setAttachmentFile(null);
                  setAttachmentPreview(null);
                  fileInputRef.current.value = "";
                }}
                className="text-[11px] underline text-red-600"
              >
                Remove
              </button>
            </div>
          )}

          {/* MESSAGE BOX */}
          <form
            onSubmit={handleSendMessage}
            className="mt-3 pt-3 flex items-center gap-2 border-t"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="px-3 py-2 rounded-xl border text-xs hover:bg-slate-100 transition"
            >
              📎 Attach
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />

            <textarea
              className="flex-1 px-3 py-2 border rounded-xl text-xs resize-none focus:ring-2 focus:ring-cignalRed/60"
              rows={2}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
            />

            <button
              type="submit"
              disabled={sending || uploading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shadow transition
                ${
                  sending || uploading
                    ? "bg-slate-300 text-slate-600"
                    : "bg-cignalRed text-white hover:bg-red-700"
                }`}
            >
              {uploading ? "Uploading..." : sending ? "Sending..." : "Send"}
            </button>
          </form>

          {error && (
            <p className="text-[11px] text-red-600 mt-1">{error}</p>
          )}
        </section>
      </main>
    </div>
  );
}
