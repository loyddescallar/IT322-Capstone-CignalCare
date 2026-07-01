// src/pages/TicketDetails.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ticketApi from "../api/ticketApi";
import TypingIndicator from "../components/TypingIndicator";
import axiosClient from "../api/axiosClient";

export default function TicketDetails() {
  const { id } = useParams();
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

  // Logged-in user (could be normal user or admin)
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // Base URL for files (strip /api from axios baseURL)
  const apiBase = axiosClient.defaults.baseURL || "";
  const fileBaseUrl = apiBase.replace(/\/api\/?$/, "");

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Track scroll to show/hide the floating "scroll to bottom" button
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
    handleScroll(); // init

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Load ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await ticketApi.getTicket(id);
        if (res.data.error) {
          setError(res.data.error);
        } else {
          setTicket(res.data.ticket || res.data);
        }
      } catch (err) {
        console.error("TICKET DETAILS ERROR:", err);
        setError(err.response?.data?.error || "Failed to load ticket details.");
      } finally {
        setLoadingTicket(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Load messages + typing and auto-refresh
  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      try {
        const res = await ticketApi.getTicketMessages(id);
        if (!active) return;

        setMessages(res.data.messages || []);
        setTyping(res.data.typing || { user: false, admin: false });
      } catch (err) {
        console.error("TICKET MESSAGES ERROR:", err);
        if (active) setError(err.response?.data?.error || "Failed to load messages.");
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  // Send message (text and/or attachment)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachmentFile) return;

    setSending(true);
    setError("");

    try {
      if (attachmentFile) {
        setUploading(true);
        await ticketApi.sendTicketAttachment(id, {
          file: attachmentFile,
          message: newMessage.trim(),
        });
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setUploading(false);
      } else if (newMessage.trim()) {
        await ticketApi.sendTicketMessage(id, newMessage.trim());
      }

      // stop typing
      if (isAdmin) {
        ticketApi.sendAdminTyping(id, false);
      } else {
        ticketApi.sendUserTyping(id, false);
      }

      setNewMessage("");

      const res = await ticketApi.getTicketMessages(id);
      setMessages(res.data.messages || []);
      setTyping(res.data.typing || { user: false, admin: false });
      scrollToBottom();
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Admin status update
  const handleStatusChange = async (status) => {
    if (!isAdmin || !ticket) return;

    try {
      await ticketApi.updateTicketStatus(ticket.id, status);
      setTicket((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      console.error("UPDATE STATUS ERROR:", err);
      alert("Failed to update ticket status.");
    }
  };

  // Attachment change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  if (loadingTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
        Loading ticket...
      </div>
    );
  }

  if (!ticket || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-600">
        <p className="mb-4">
          {user ? "Ticket not found." : "You must be logged in to view this ticket."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded bg-cignalRed text-white text-sm font-semibold shadow hover:bg-red-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-slideDown">
            <p className="text-xs uppercase text-cignalRed font-semibold tracking-[0.2em]">
              Ticket #{ticket.id}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {ticket.subject}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Category:{" "}
              <span className="font-semibold text-slate-800">
                {ticket.category}
              </span>{" "}
              • Created:{" "}
              {ticket.created_at
                ? new Date(ticket.created_at).toLocaleString()
                : "N/A"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              You are viewing this as{" "}
              <span className="font-semibold">
                {isAdmin ? "Admin" : "Customer"}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-3 animate-slideLeft">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Status:
              </span>

              {isAdmin ? (
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs sm:text-sm border border-cignalRed/60 rounded-full px-3 py-1 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cignalRed/50"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              ) : (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                    ${
                      ticket.status === "Resolved" || ticket.status === "Closed"
                        ? "bg-emerald-100 text-emerald-700"
                        : ticket.status === "In Progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {ticket.status}
                </span>
              )}
            </div>

            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-full border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-[2px] bg-cignalRed opacity-60" />

        {/* Messages area */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 flex flex-col h-[70vh] max-h-[620px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Conversation
            </h2>
            {ticket.status === "Closed" && (
              <span className="text-[11px] text-slate-500">
                This ticket is <span className="font-semibold">closed</span>.
              </span>
            )}
          </div>

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
                // Messenger-style: current viewer's messages on the right
                const myRole = isAdmin ? "admin" : "user";
                const isMine = msg.sender_role === myRole;

                const attachmentUrl =
                  msg.attachment && `${fileBaseUrl}/uploads/messages/${msg.attachment}`;
                const isImage =
                  msg.attachment_type &&
                  msg.attachment_type.startsWith("image/");

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-xs sm:text-sm shadow-md animate-bubblePop
                        ${
                          isMine
                            ? "bg-cignalRed text-white rounded-br-none animate-slideRight"
                            : "bg-slate-200 text-slate-900 rounded-bl-none animate-slideLeft"
                        }`}
                    >
                      {msg.message && (
                        <p className="whitespace-pre-wrap break-words leading-snug">
                          {msg.message}
                        </p>
                      )}

                      {attachmentUrl && (
                        <div className="mt-2">
                          {isImage ? (
                            <img
                              src={attachmentUrl}
                              alt="attachment"
                              className="rounded-lg max-h-48 w-auto border border-white/30"
                            />
                          ) : (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-[11px] underline ${
                                isMine ? "text-red-100" : "text-red-700"
                              }`}
                            >
                              Download attachment
                            </a>
                          )}
                        </div>
                      )}

                      <p
                        className={`mt-1 text-[10px] ${
                          isMine ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {!isAdmin && typing.admin && (
              <TypingIndicator who="Admin is typing..." />
            )}
            {isAdmin && typing.user && (
              <TypingIndicator who="User is typing..." />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating scroll-to-bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute right-6 bottom-28 xs:bottom-24 sm:bottom-24 bg-cignalRed text-white text-[11px] px-3 py-1 rounded-full shadow-cignal hover:bg-red-700 transition-colors"
            >
              ↓ New messages
            </button>
          )}

          {/* Attachment preview */}
          {attachmentPreview && (
            <div className="mt-2 mb-1 flex items-center gap-3 text-xs text-slate-600">
              <img
                src={attachmentPreview}
                alt="preview"
                className="h-10 w-10 rounded border border-slate-300 object-cover"
              />
              <span>Attachment ready to send</span>
              <button
                onClick={() => {
                  setAttachmentFile(null);
                  setAttachmentPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-[11px] text-red-500 underline"
              >
                Remove
              </button>
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSendMessage}
            className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-100 transition-colors"
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
              className="flex-1 text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-cignalRed/60 focus:border-cignalRed/60"
              rows={2}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);

                if (isAdmin) {
                  ticketApi.sendAdminTyping(id, true);
                } else {
                  ticketApi.sendUserTyping(id, true);
                }

                clearTimeout(window.typingTimeout);
                window.typingTimeout = setTimeout(() => {
                  if (isAdmin) {
                    ticketApi.sendAdminTyping(id, false);
                  } else {
                    ticketApi.sendUserTyping(id, false);
                  }
                }, 1800);
              }}
            />

            <button
              type="submit"
              disabled={
                sending || uploading || (!newMessage.trim() && !attachmentFile)
              }
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow
                ${
                  sending || uploading || (!newMessage.trim() && !attachmentFile)
                    ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                    : "bg-cignalRed text-white hover:bg-red-700 cursor-pointer"
                } transition-colors`}
            >
              {uploading ? "Uploading..." : sending ? "Sending..." : "Send"}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-[11px] text-red-600 font-medium">{error}</p>
          )}
        </section>
      </main>
    </div>
  );
}
