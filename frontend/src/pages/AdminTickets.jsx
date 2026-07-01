import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ticketApi from "../api/ticketApi";
import AdminLayout from "../components/admin/AdminLayout";

export default function AdminTickets({ embedded = false }) {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await ticketApi.getAdminTickets();

      if (data?.error) {
        setError(data.error);
        setTickets([]);
        return;
      }

      setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    let result = [...tickets];

    if (statusFilter !== "All") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const idMatch = String(t.id).includes(q);
        const subjectMatch = (t.subject || "").toLowerCase().includes(q);
        const categoryMatch = (t.category || "").toLowerCase().includes(q);
        const nameMatch = (t.accountName || "").toLowerCase().includes(q);
        return idMatch || subjectMatch || categoryMatch || nameMatch;
      });
    }

    setFilteredTickets(result);
  }, [tickets, statusFilter, search]);

  const selectTicket = async (ticketId) => {
    setSelectedTicketId(ticketId);
    setSelectedTicket(null);
    setMessages([]);
    setError("");

    try {
      const [ticketRes, messagesRes] = await Promise.all([
        ticketApi.getTicket(ticketId),
        ticketApi.getTicketMessages(ticketId),
      ]);

      if (ticketRes.data?.error) {
        setError(ticketRes.data.error);
      } else {
        setSelectedTicket(ticketRes.data.ticket || ticketRes.data);
      }

      if (messagesRes.data?.error) {
        setError((prev) => prev || messagesRes.data.error);
      } else {
        setMessages(messagesRes.data.messages || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load ticket details.");
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return;

    setUpdatingStatus(true);
    setError("");

    try {
      const { data } = await ticketApi.updateTicketStatus(
        selectedTicketId,
        newStatus
      );

      if (data?.error) {
        setError(data.error);
      } else {
        await selectTicket(selectedTicketId);
        await loadTickets();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedTicketId) return;

    setSending(true);
    setError("");

    try {
      const { data } = await ticketApi.sendTicketMessage(
        selectedTicketId,
        messageText.trim()
      );

      if (data?.error) {
        setError(data.error);
      } else {
        setMessageText("");
        const res = await ticketApi.getTicketMessages(selectedTicketId);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const statusPillClass = (status) => {
    if (status === "Open") return "bg-green-100 text-green-700";
    if (status === "In Progress") return "bg-yellow-100 text-yellow-700";
    if (status === "Resolved") return "bg-blue-100 text-blue-700";
    return "bg-slate-200 text-slate-700";
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Support Tickets
          </h1>
          <p className="text-sm text-slate-500">
            View all user tickets, update their status, and chat with users.
          </p>
        </div>

        {!embedded && (
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>

      {error && (
        <div className="rounded bg-red-100 text-red-700 px-4 py-2 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <input
          placeholder="Search by ID, subject, category, or account name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 w-full md:w-96"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1.5fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-sm text-slate-900">Tickets</span>
            {loading && (
              <span className="text-xs text-slate-400">Loading...</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-center text-slate-400"
                    >
                      No tickets found.
                    </td>
                  </tr>
                )}

                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => selectTicket(t.id)}
                    className={`cursor-pointer border-b border-slate-200 hover:bg-slate-50 ${
                      selectedTicketId === t.id ? "bg-slate-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2 text-slate-900">{t.id}</td>
                    <td className="px-4 py-2 text-slate-900">
                      {t.accountName || t.user_id}
                    </td>
                    <td className="px-4 py-2 max-w-[240px] truncate text-slate-900">
                      {t.subject || "(no subject)"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${statusPillClass(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200">
            <span className="font-semibold text-sm text-slate-900">Details</span>
          </div>

          {!selectedTicketId ? (
            <div className="p-4 text-sm text-slate-400">
              Select a ticket to view details and chat.
            </div>
          ) : !selectedTicket ? (
            <div className="p-4 text-sm text-slate-400">Loading ticket...</div>
          ) : (
            <div className="p-4 flex flex-col gap-4 flex-1">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  Ticket #{selectedTicket.id}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {selectedTicket.subject}
                </p>
                <p className="text-xs text-slate-500">
                  Category:{" "}
                  <span className="font-semibold">
                    {selectedTicket.category}
                  </span>
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updatingStatus}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                  {updatingStatus && (
                    <span className="text-[11px] text-slate-400">
                      Updating...
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex-1 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-400">No messages yet.</p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_role === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                            isMine
                              ? "bg-cignalRed text-white rounded-br-none"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                          }`}
                        >
                          {m.message && (
                            <p className="whitespace-pre-wrap break-words">
                              {m.message}
                            </p>
                          )}
                          <p
                            className={`mt-1 text-[10px] ${
                              isMine ? "text-red-100" : "text-slate-400"
                            }`}
                          >
                            {m.created_at
                              ? new Date(m.created_at).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded bg-cignalRed text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>

              <button
                onClick={() => navigate(`/admin/chat/${selectedTicketId}`)}
                className="text-xs underline text-slate-500 hover:text-slate-800"
              >
                Open full chat view
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminLayout
      title="Support Tickets"
      subtitle="View all user tickets, update their status, and chat with users."
    >
      {content}
    </AdminLayout>
  );
}