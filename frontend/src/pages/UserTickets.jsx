// src/pages/UserTickets.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ticketApi from "../api/ticketApi";
import { useNavigate } from "react-router-dom";

export default function UserTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Format time helper
  const formatTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  // Load tickets for logged-in user
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await ticketApi.getMyTickets();
        const backendTickets = res.data.tickets || [];

        setTickets(
          backendTickets.map((t) => ({
            id: t.id,
            category: t.category,
            subject: t.subject,
            created: t.created_at,
            status: t.status,
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Check unread using localStorage
  const isUnread = (ticketId) => {
    return localStorage.getItem(`ticket_read_${ticketId}`) !== "true";
  };

  // When user opens a ticket → mark as read
  const openTicket = (id) => {
    localStorage.setItem(`ticket_read_${id}`, "true");
    navigate(`/tickets/${id}`);
  };

  // Apply filtering
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "All") return true;
    return t.status === statusFilter;
  });

  // Sorting
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === "Newest") {
      return new Date(b.created) - new Date(a.created);
    }
    return new Date(a.created) - new Date(b.created);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="main-shell animate-slide-left">
        <h1 className="text-3xl font-semibold mb-6">My Support Tickets</h1>

        {loading && <p className="text-sm text-slate-400 mb-4">Loading tickets...</p>}
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            className="bg-slate-800 border border-slate-700 p-2 rounded text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>

          <select
            className="bg-slate-800 border border-slate-700 p-2 rounded text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>

        {/* TICKET LIST */}
        <div className="bg-slate-900 p-4 rounded-xl">
          <h2 className="font-semibold mb-3">Tickets</h2>

          {sortedTickets.length === 0 && (
            <p className="text-xs text-slate-400">No tickets found.</p>
          )}

          {sortedTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => openTicket(t.id)}
              className="p-4 mb-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-cignalRed/60 cursor-pointer transition"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">{t.subject}</p>

                {/* UNREAD BADGE */}
                {isUnread(t.id) && (
                  <span className="text-[10px] bg-cignalRed px-2 py-1 rounded-full font-bold">
                    NEW
                  </span>
                )}
              </div>

              <p className="text-xs mt-1 text-slate-400">{t.category}</p>

              <p className="text-xs mt-1 text-slate-400">
                Status: <span className="text-white font-semibold">{t.status}</span>
              </p>

              <p className="text-[10px] mt-1 text-slate-500">
                Created: {formatTime(t.created)}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
