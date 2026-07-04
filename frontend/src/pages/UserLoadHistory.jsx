import { useEffect, useMemo, useState } from "react";
import { Calendar, CreditCard, Eye, ReceiptText, RefreshCw, Satellite, Search, Tv, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { getMyLoadRequests } from "../api/loadRequestApi";

const STATUS_STYLE = {
  Received: "border-blue-200 bg-blue-50 text-blue-700",
  "Under Review": "border-amber-200 bg-amber-50 text-amber-700",
  Attending: "border-purple-200 bg-purple-50 text-purple-700",
  Completed: "border-green-200 bg-green-50 text-green-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

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

export default function UserLoadHistory() {
  const user = getUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewPhoto, setViewPhoto] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyLoadRequests(user?.id);
      const data = res.data?.history || res.data?.requests || res.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load history", err);
      setError(err?.response?.data?.error || "Failed to load your load request history.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) =>
      [
        req.account_name,
        req.accountName,
        req.account_number,
        req.accountNumber,
        req.plan_name,
        req.planName,
        req.reference_no,
        req.reference_number,
        req.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [requests, search]);

  return (
    <div className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <section className="rounded-[28px] bg-gradient-to-br from-[#cc0000] to-[#880000] p-6 text-white shadow-lg animate-load-slide-up">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Satellite size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">My Load Requests</h1>
                <p className="text-sm text-red-100">Track your remote prepaid reload submissions and verification status.</p>
              </div>
            </div>
            <button onClick={fetchHistory} className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/25">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Total Requests" value={loading ? "..." : requests.length} />
          <Kpi label="Pending Review" value={loading ? "..." : requests.filter((r) => ["Received", "Under Review", "pending"].includes(r.status)).length} />
          <Kpi label="Completed" value={loading ? "..." : requests.filter((r) => ["Completed", "approved"].includes(r.status)).length} />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm animate-load-fade">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plan, account, reference, status..."
                className="w-full rounded-2xl border border-slate-300 px-10 py-3 text-sm outline-none focus:border-cignalRed focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</div>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-4">Plan</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Reference</th>
                  <th className="px-4 py-4">Diagnostic</th>
                  <th className="px-4 py-4">Submitted</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading load requests...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No load requests found.</td></tr>
                ) : (
                  filtered.map((req, index) => {
                    const status = req.status || "Received";
                    return (
                      <tr key={req.id || index} className="hover:bg-slate-50 animate-load-fade" style={{ animationDelay: `${index * 35}ms` }}>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">{req.plan_name || req.planName || "Load Request"}</p>
                          <p className="text-xs font-semibold text-cignalRed">₱{Number(req.amount || req.loadAmount || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${req.payment_method === "Maya" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                            <CreditCard size={12} /> {req.payment_method || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs">{req.reference_no || req.reference_number || "—"}</td>
                        <td className="px-4 py-4 text-xs text-slate-600">{req.diagnostic_result || "Channel 1 OK"}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtDate(req.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.Received}`}>{status}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {(req.receipt_photo || req.receipt_image) && (
                              <button onClick={() => setViewPhoto({ src: req.receipt_photo || req.receipt_image, label: "Receipt" })} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-cignalRed" title="View receipt">
                                <ReceiptText size={16} />
                              </button>
                            )}
                            {req.screen_photo && (
                              <button onClick={() => setViewPhoto({ src: req.screen_photo, label: "TV Screen" })} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title="View TV screen">
                                <Tv size={16} />
                              </button>
                            )}
                            {!req.receipt_photo && !req.receipt_image && !req.screen_photo && <Eye size={16} className="text-slate-200" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-load-fade">
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-load-pop">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <p className="font-bold text-gray-800">{viewPhoto.label} Photo</p>
              <button onClick={() => setViewPhoto(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-4">
              <img src={viewPhoto.src} alt={viewPhoto.label} className="max-h-96 w-full rounded-xl border border-gray-100 object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm animate-load-slide-up">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cignalRed">{label}</p>
      <p className="mt-3 text-4xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
