// src/pages/UserChat.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ticketApi from "../api/ticketApi";
import TypingIndicator from "../components/TypingIndicator";
import axiosClient from "../api/axiosClient";

export default function UserChat() {
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
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  const apiBase = axiosClient.defaults.baseURL || "";
  const fileBaseUrl = apiBase.replace(/\/api\/?$/, "");

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Fetch ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await ticketApi.getTicket(ticketId);
        if (res.data.error) {
          setError(res.data.error);
        } else {
          setTicket(res.data.ticket || res.data);
        }
      } catch (err) {
        console.error("USER CHAT TICKET ERROR:", err);
        setError(err.response?.data?.error || "Failed to load ticket details.");
      } finally {
        setLoadingTicket(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // Fetch messages + typing
  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      try {
        const res = await ticketApi.getTicketMessages(ticketId);
        if (!active) return;

        setMessages(res.data.messages || []);
        setTyping(res.data.typing || { user: false, admin: false });
      } catch (err) {
        console.error("USER CHAT MESSAGES ERROR:", err);
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
  }, [ticketId]);

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
          message: newMessage.trim(),
        });
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setUploading(false);
      } else if (newMessage.trim()) {
        await ticketApi.sendTicketMessage(ticketId, newMessage.trim());
      }

      ticketApi.sendUserTyping(ticketId, false);
      setNewMessage("");

      const res = await ticketApi.getTicketMessages(ticketId);
      setMessages(res.data.messages || []);
      setTyping(res.data.typing || { user: false, admin: false });
    } catch (err) {
      console.error("USER CHAT SEND ERROR:", err);
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">
          Please log in to view your chat.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.25s_ease-out]">
          <div>
            <p className="text-[11px] uppercase text-red-200 font-semibold tracking-[0.25em]">
              Support Ticket #{ticket?.id || ticketId}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {loadingTicket ? "Loading..." : ticket?.subject || "My Support Chat"}
            </h1>
            {ticket && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Category:{" "}
                <span className="font-semibold text-white">
                  {ticket.category}
                </span>{" "}
                • Created:{" "}
                {ticket.created_at
                  ? new Date(ticket.created_at).toLocaleString()
                  : "N/A"}
              </p>
            )}
          </div>

          <button
            onClick={() => navigate("/user/tickets")}
            className="px-3 py-1.5 rounded-full border border-red-300 text-xs sm:text-sm text-red-100 hover:bg-red-600/20 transition-colors"
          >
            ← Back to My Tickets
          </button>
        </div>

        {/* Chat Card */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-700/40 p-4 sm:p-5 flex flex-col h-[70vh] max-h-[620px] text-slate-900 animate-[fadeIn_0.25s_ease-out]">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Conversation with Cignal Support
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loadingMessages ? (
              <p className="text-xs text-slate-500">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-500">
                No messages yet. Say hello to start the conversation.
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
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
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-xs sm:text-sm shadow-md
                        ${
                          isMine
                            ? "bg-cignalRed text-white rounded-br-none"
                            : "bg-slate-200 text-slate-900 rounded-bl-none"
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

            {/* Admin typing indicator */}
            {typing.admin && <TypingIndicator who="Admin is typing..." />}

            <div ref={messagesEndRef} />
          </div>

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

                ticketApi.sendUserTyping(ticketId, true);
                clearTimeout(window.typingTimeout);
                window.typingTimeout = setTimeout(() => {
                  ticketApi.sendUserTyping(ticketId, false);
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
