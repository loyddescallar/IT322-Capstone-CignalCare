import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  ReceiptText,
  RefreshCw,
  Satellite,
  Search,
  Tv,
  User,
  X,
} from "lucide-react";

import AdminLayout from "../components/admin/AdminLayout";
import { getAllLoadRequests, updateLoadStatus } from "../api/loadRequestApi";

/* =========================
   CONFIG
========================= */
const STATUSES = ["Received", "Under Review", "Attending", "Completed", "Rejected"];

const STATUS_CONFIG = {
  Received: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Clock },
  "Under Review": { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: RefreshCw },
  Attending: { color: "text-purple-600", bg: "bg-purple-50 border-purple-200", icon: RefreshCw },
  Completed: { color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  Rejected: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertTriangle },
};

const NEXT_STATUS = {
  Received: "Under Review",
  "Under Review": "Attending",
  Attending: "Completed",
};

/* =========================
   FORMAT
========================= */
function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================
   MAIN CONTENT
========================= */
function AdminLoadRequestsContent() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selected, setSelected] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  /* FETCH */
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await getAllLoadRequests();
      const data = res.data?.history || res.data?.requests || res.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* FILTER */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return requests.filter((r) => {
      const matchSearch =
        !q ||
        String(r.account_name || "").toLowerCase().includes(q) ||
        String(r.account_number || "").toLowerCase().includes(q) ||
        String(r.reference_no || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "All" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  /* STATUS UPDATE */
  const handleStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await updateLoadStatus(id, status);
      await fetchRequests();
      setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Load Requests
          </h1>
          <p className="text-sm text-slate-500">
            Manage prepaid load requests in real-time
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow hover:shadow-md"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* STATS FILTER */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setStatusFilter("All")}
          className="px-4 py-2 rounded-xl bg-white shadow"
        >
          All
        </button>

        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = requests.filter((r) => r.status === s).length;

          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl bg-white shadow border ${cfg.bg}`}
            >
              <span className={cfg.color}>
                {s} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* SEARCH */}
      <div className="flex gap-3">
        <div className="flex items-center bg-white shadow rounded-xl px-3 w-full">
          <Search size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account, name, reference..."
            className="w-full p-2 outline-none"
          />
        </div>
      </div>

      {/* GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {filtered.map((r) => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Received;
          const Icon = cfg.icon;

          return (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="bg-white rounded-2xl shadow hover:shadow-xl transition p-5 cursor-pointer space-y-3"
            >
              {/* TOP */}
              <div className="flex justify-between">
                <div>
                  <p className="font-bold text-slate-800">
                    {r.account_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.account_number}
                  </p>
                </div>

                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon size={12} />
                  {r.status}
                </span>
              </div>

              {/* DETAILS */}
              <div className="text-sm text-slate-600 space-y-1">
                <p><b>Plan:</b> {r.plan_name}</p>
                <p><b>Amount:</b> ₱{r.amount}</p>
                <p><b>Payment:</b> {r.payment_method}</p>
                <p><b>Ref:</b> {r.reference_no}</p>
              </div>

              <p className="text-xs text-slate-400">
                {fmtDate(r.created_at)}
              </p>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4">

            <div className="flex justify-between">
              <h2 className="font-bold">Request Details</h2>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>

            <div className="text-sm space-y-1">
              <p><b>Name:</b> {selected.account_name}</p>
              <p><b>Account:</b> {selected.account_number}</p>
              <p><b>Plan:</b> {selected.plan_name}</p>
              <p><b>Amount:</b> ₱{selected.amount}</p>
              <p><b>Payment:</b> {selected.payment_method}</p>
              <p><b>Reference:</b> {selected.reference_no}</p>
            </div>

            {selected.receipt_photo && (
              <img
                src={selected.receipt_photo}
                className="w-full rounded-xl border"
              />
            )}

            <div className="flex gap-2 flex-wrap">
              {NEXT_STATUS[selected.status] && (
                <button
                  disabled={updatingId === selected.id}
                  onClick={() =>
                    handleStatus(selected.id, NEXT_STATUS[selected.status])
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl"
                >
                  Mark {NEXT_STATUS[selected.status]}
                </button>
              )}

              <button
                onClick={() => setSelected(null)}
                className="bg-gray-200 px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* =========================
   WRAPPER
========================= */
export default function AdminLoadRequests() {
  return (
    <AdminLayout>
      <AdminLoadRequestsContent />
    </AdminLayout>
  );
}