import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, MapPin, User, Hash, Tv,
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Calendar, Banknote, ShieldCheck, TrendingUp, Flag,
  CreditCard, Wrench, Ticket as TicketIcon, BrainCircuit, Info,
} from "lucide-react";
import customerApi from "../api/customerApi";
import ticketApi from "../api/ticketApi";
import axiosClient from "../api/axiosClient";

function getActivityStatus(lastLoadDate) {
  if (!lastLoadDate) return "Inactive";
  const days = (Date.now() - new Date(lastLoadDate).getTime()) / 86400000;
  if (days <= 30) return "Active";
  if (days <= 60) return "At Risk";
  return "Inactive";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function computeChurnScore(lastLoadDate, activeTickets, openTechReqs) {
  let risk = 10;
  const reasons = [];
  const status = getActivityStatus(lastLoadDate);
  if (status === "Inactive") { risk += 40; reasons.push("subscription expired or no reload in 60+ days"); }
  else if (status === "At Risk") { risk += 25; reasons.push("31–60 days without reload"); }
  if (activeTickets > 0) { risk += activeTickets * 12; reasons.push(`${activeTickets} active ticket${activeTickets > 1 ? "s" : ""} unresolved`); }
  if (openTechReqs > 0) { risk += openTechReqs * 10; reasons.push(`${openTechReqs} pending tech request${openTechReqs > 1 ? "s" : ""}`); }
  risk = Math.min(risk, 95);
  const reason = reasons.length
    ? reasons.join("; ") + "."
    : status === "Active" ? "Active subscription, no open issues — strong retention candidate." : "No significant churn signals detected.";
  return { risk, reason: reason.charAt(0).toUpperCase() + reason.slice(1) };
}

const ticketStatusConfig = {
  Open:          { classes: "bg-red-100 text-red-700",    Icon: Flag },
  "In Progress": { classes: "bg-amber-100 text-amber-700", Icon: Clock },
  Resolved:      { classes: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  Closed:        { classes: "bg-slate-100 text-slate-600", Icon: CheckCircle2 },
};

export default function AdminCustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer]     = useState(null);
  const [tickets, setTickets]       = useState([]);
  const [techReqs, setTechReqs]     = useState([]);
  const [transactions, setTrans]    = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("transactions");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const custRes = await customerApi.getCustomerById(id);
        const cust = custRes.data?.customer;
        setCustomer(cust);

        const [ticketRes, techRes, txRes] = await Promise.all([
          ticketApi.getAdminTickets().catch(() => ({ data: { tickets: [] } })),
          axiosClient.get("/technicians").catch(() => ({ data: { requests: [] } })),
          axiosClient.get(`/load/history?accountNumber=${cust?.accountNumber || ""}`).catch(() => ({ data: { history: [] } })),
        ]);

        const allTickets = ticketRes.data?.tickets || [];
        const allTech    = techRes.data?.requests || techRes.data?.technicians || [];
        const allTx      = txRes.data?.history || [];

        setTickets(allTickets.filter(t => t.accountNumber === cust?.accountNumber || t.user_id === cust?.id));
        setTechReqs(allTech.filter(r => r.accountNumber === cust?.accountNumber || r.user_id === cust?.id));
        setTrans(allTx.filter(t => t.accountNumber === cust?.accountNumber));
      } catch (err) {
        console.error("CustomerProfile load error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <User size={32} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">Customer not found.</p>
        <button onClick={() => navigate("/admin/customers")} className="mt-3 text-xs text-red-600 hover:underline">
          ← Back to Customers
        </button>
      </div>
    );
  }

  const actStatus    = getActivityStatus(customer.lastLoadDate);
  const activeTickets = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
  const openTechReqs  = techReqs.filter(r => r.status !== "Completed" && r.status !== "Cancelled").length;
  const churn         = computeChurnScore(customer.lastLoadDate, activeTickets, openTechReqs);
  const totalSpent    = transactions.reduce((s, t) => s + Number(t.loadAmount || t.amount || 0), 0);

  const riskColor    = churn.risk >= 70 ? "text-red-600 bg-red-50 border-red-200" : churn.risk >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-green-600 bg-green-50 border-green-200";
  const riskBarColor = churn.risk >= 70 ? "bg-red-500" : churn.risk >= 40 ? "bg-amber-400" : "bg-green-400";

  const actStatusStyle = {
    Active:    { badge: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" },
    "At Risk": { badge: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
    Inactive:  { badge: "bg-slate-100 text-slate-600 border-slate-200",  dot: "bg-slate-400" },
  }[actStatus];

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={() => navigate("/admin/customers")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors">
        <ArrowLeft size={13} /> Back to Customers
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-red-600 h-2" />
        <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {customer.accountName?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-slate-900">{customer.accountName}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1"><Hash size={11} className="text-slate-400" /><span className="text-xs font-mono text-slate-600">{customer.accountNumber}</span></div>
                  <div className="flex items-center gap-1"><ShieldCheck size={11} className="text-red-600" /><span className="text-xs text-slate-600">{customer.ccaNumber}</span></div>
                  <div className="flex items-center gap-1"><Phone size={11} className="text-slate-400" /><span className="text-xs text-slate-600">{customer.phone}</span></div>
                  <div className="flex items-center gap-1"><MapPin size={11} className="text-slate-400" /><span className="text-xs text-slate-600">{customer.address}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${actStatusStyle.badge}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${actStatusStyle.dot}`} />
                  {actStatus}
                </span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium">
                  {customer.location} · Since {formatDate(customer.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1"><CreditCard size={13} className="text-red-600" /><p className="text-xs text-slate-500">Total Load Spend</p></div>
          <p className="text-xl font-bold text-red-600">₱{totalSpent.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1"><TicketIcon size={13} className="text-purple-500" /><p className="text-xs text-slate-500">Total Tickets</p></div>
          <p className="text-xl font-bold text-slate-800">{tickets.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{activeTickets} active</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1"><Wrench size={13} className="text-blue-500" /><p className="text-xs text-slate-500">Service Jobs</p></div>
          <p className="text-xl font-bold text-slate-800">{techReqs.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{openTechReqs} pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1"><BrainCircuit size={13} className="text-red-600" /><p className="text-xs text-slate-500">AI Churn Risk</p></div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${riskBarColor}`} style={{ width: `${churn.risk}%` }} />
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${riskColor}`}>{churn.risk}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-snug">{churn.reason.split("—")[0].trim()}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Tabs */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {([
              { key: "transactions", label: "Transactions",    Icon: CreditCard, count: transactions.length },
              { key: "tickets",      label: "Tickets",         Icon: TicketIcon, count: tickets.length },
              { key: "service",      label: "Service History", Icon: Wrench,     count: techReqs.length },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === tab.key ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                <tab.Icon size={12} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"
                }`} style={{ fontSize: "10px" }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Load History</h2>
              </div>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CreditCard size={24} className="mb-2 opacity-30" />
                  <p className="text-xs">No transactions on record.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {transactions.map((tx, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">₱{Number(tx.loadAmount || tx.amount || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{tx.description || tx.plan_name || "Prepaid Load"}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={9} /> {formatDate((tx.created_at || "").split(" ")[0])}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tx.status === "completed" ? "bg-green-50 text-green-600" :
                          tx.status === "pending"   ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                        }`}>{tx.status || "completed"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === "tickets" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Ticket History</h2>
              </div>
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <TicketIcon size={24} className="mb-2 opacity-30" />
                  <p className="text-xs">No tickets submitted yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {tickets.map(t => {
                    const cfg = ticketStatusConfig[t.status] || ticketStatusConfig["Open"];
                    return (
                      <div key={t.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/admin/chat/${t.id}`)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{t.subject}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-mono text-slate-400" style={{ fontSize: "10px" }}>#{t.id}</span>
                              <span className="text-xs text-slate-400">{t.category}</span>
                              <span className="text-slate-400 flex items-center gap-0.5" style={{ fontSize: "10px" }}>
                                <Calendar size={9} /> {(t.created_at || "").split(" ")[0]}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.classes}`}>
                              <cfg.Icon size={10} />{t.status}
                            </span>
                            <ChevronRight size={12} className="text-slate-300" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Service History Tab */}
          {activeTab === "service" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Technician Request History</h2>
              </div>
              {techReqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Wrench size={24} className="mb-2 opacity-30" />
                  <p className="text-xs">No service records on file.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {techReqs.map(r => (
                    <div key={r.id} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{r.issueDescription}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-slate-400 flex items-center gap-0.5" style={{ fontSize: "10px" }}>
                              <Calendar size={9} /> {(r.created_at || "").split(" ")[0]}
                            </span>
                            {r.technician_name && <span className="text-slate-400" style={{ fontSize: "10px" }}>👤 {r.technician_name}</span>}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          r.status === "Completed"  ? "bg-green-100 text-green-700" :
                          r.status === "Scheduled"  ? "bg-blue-100 text-blue-700"  :
                          r.status === "Cancelled"  ? "bg-slate-100 text-slate-500" :
                                                      "bg-amber-100 text-amber-700"
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: AI Insight + Account Details */}
        <div className="space-y-3">
          {/* AI Insight */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit size={14} className="text-red-600" />
              <h2 className="text-sm font-semibold text-slate-700">AI Subscriber Insight</h2>
              <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Beta</span>
            </div>
            <div className={`rounded-xl p-3 border mb-3 ${riskColor}`}>
              <div className="flex items-start gap-2">
                {churn.risk >= 70 ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> :
                 churn.risk >= 40 ? <Clock size={14} className="flex-shrink-0 mt-0.5" /> :
                                    <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-xs font-bold mb-0.5">
                    Churn Risk: {churn.risk}% — {churn.risk >= 70 ? "HIGH" : churn.risk >= 40 ? "MEDIUM" : "LOW"}
                  </p>
                  <p className="text-xs leading-snug opacity-80">{churn.reason}</p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-white/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${riskBarColor}`} style={{ width: `${churn.risk}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Info size={11} className="text-red-600" /> Recommended Actions
              </p>
              {activeTickets > 0 && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl p-2">
                  <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-snug">
                    {activeTickets} active ticket{activeTickets > 1 ? "s" : ""} — prioritize resolution.
                  </p>
                </div>
              )}
              {openTechReqs > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-2">
                  <Wrench size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-snug">
                    {openTechReqs} pending tech request{openTechReqs > 1 ? "s" : ""} — confirm dispatch.
                  </p>
                </div>
              )}
              {customer.lastLoadDate && (
                <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-2">
                  <TrendingUp size={11} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-snug">
                    Last load: {formatDate(customer.lastLoadDate)}. Consider renewal reminder.
                  </p>
                </div>
              )}
              {activeTickets === 0 && openTechReqs === 0 && (
                <div className="flex items-start gap-2 bg-green-50 rounded-xl p-2">
                  <CheckCircle2 size={11} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700 leading-snug">No active issues. Strong retention candidate.</p>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User size={11} className="text-red-600" /> Account Details
            </p>
            {[
              { label: "Account No.", value: customer.accountNumber, Icon: Hash },
              { label: "CCA No.",     value: customer.ccaNumber,     Icon: ShieldCheck },
              { label: "Phone",       value: customer.phone,         Icon: Phone },
              { label: "Location",    value: customer.location || "—", Icon: MapPin },
              { label: "Since",       value: formatDate(customer.created_at), Icon: Calendar },
              { label: "Last Load",   value: customer.lastLoadDate ? formatDate(customer.lastLoadDate) : "No record", Icon: Tv },
              { label: "Status",      value: actStatus, Icon: Banknote },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <f.Icon size={10} className="text-slate-300 flex-shrink-0" />
                  <p className="text-xs text-slate-400">{f.label}</p>
                </div>
                <p className="text-xs font-semibold text-slate-800 text-right">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
