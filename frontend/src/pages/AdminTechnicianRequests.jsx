// src/pages/AdminTechnicianRequests.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ticketApi from "../api/ticketApi";
import AdminLayout from "../components/admin/AdminLayout";

export default function AdminTechnicianRequests({ embedded = false }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ticketApi.getAdminTickets();
      const allTickets = res.data.tickets || [];

      const techTickets = allTickets.filter(
        (t) => t.category === "Technician Request"
      );

      setRequests(techTickets);
      setFiltered(techTickets);
    } catch (err) {
      console.error("ADMIN TECH REQUESTS ERROR:", err);
      setError("Failed to load technician requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    let list = [...requests];

    if (statusFilter !== "All") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.subject && r.subject.toLowerCase().includes(term)) ||
          (r.accountName && r.accountName.toLowerCase().includes(term)) ||
          String(r.id).includes(term)
      );
    }

    setFiltered(list);
  }, [statusFilter, search, requests]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await ticketApi.updateTicketStatus(id, newStatus);
      await loadRequests();
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);
      alert("Failed to update ticket status.");
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Technician Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all tickets categorized as technician requests.
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

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-slate-600 uppercase">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-full px-3 py-1 bg-white text-slate-900"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="flex-1 flex justify-end">
          <input
            type="text"
            placeholder="Search by subject, name, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 border border-slate-300 rounded-full px-3 py-2 text-sm text-slate-900 bg-white"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 animate-pulse">
            Loading technician requests...
          </p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cignalRed text-white">
              <tr>
                <th className="p-3 text-left">Ticket ID</th>
                <th className="p-3 text-left">Account Name</th>
                <th className="p-3 text-left">Subject</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-4 text-center text-slate-500 text-sm"
                  >
                    No technician request tickets found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="p-3 font-semibold text-slate-900">{t.id}</td>
                    <td className="p-3 text-slate-800">
                      {t.accountName || t.user_id}
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-800">
                      {t.subject}
                    </td>

                    <td className="p-3">
                      <select
                        value={t.status}
                        onChange={(e) =>
                          handleStatusChange(t.id, e.target.value)
                        }
                        className="border border-slate-300 rounded-full px-2 py-1 text-xs bg-white text-slate-900"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>

                    <td className="p-3 text-slate-500">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString()
                        : "N/A"}
                    </td>

                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => navigate(`/admin/chat/${t.id}`)}
                        className="text-xs px-3 py-1 rounded-full bg-cignalRed text-white hover:bg-red-700"
                      >
                        Open Chat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminLayout
      title="Technician Requests"
      subtitle="View and manage all tickets categorized as technician requests."
    >
      {content}
    </AdminLayout>
  );
}