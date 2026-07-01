import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TicketIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  MagnifyingGlassCircleIcon,
} from "@heroicons/react/24/outline";
import ticketApi from "../api/ticketApi";
import customerApi from "../api/customerApi";
import loadAdminApi from "../api/loadAdminApi";
import {
  buildDashboardInsights,
  buildMonthlySeries,
  summarizeTicketsByCategory,
  summarizeTicketsByStatus,
} from "../utils/adminInsights";

const STATUS_COLORS = {
  Open: "bg-red-500",
  "In Progress": "bg-amber-400",
  Resolved: "bg-green-500",
  Closed: "bg-slate-400",
};

export default function AdminDashboard({ embedded = false }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [ticketRes, customerRes, loadRes] = await Promise.all([
          ticketApi.getAdminTickets(),
          customerApi.getCustomers(),
          loadAdminApi.getAll(),
        ]);

        if (!active) return;

        setTickets(ticketRes.data?.tickets || []);
        setCustomers(customerRes.data?.customers || []);
        setLoads(loadRes.data?.history || []);
      } catch (err) {
        console.error("ADMIN DASHBOARD ERROR", err);
        if (active) setError("Failed to load admin dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const statusCounts = useMemo(() => summarizeTicketsByStatus(tickets), [tickets]);
  const categoryCounts = useMemo(() => summarizeTicketsByCategory(tickets), [tickets]);
  const customerGrowth = useMemo(() => buildMonthlySeries(customers), [customers]);
  const insights = useMemo(
    () => buildDashboardInsights({ tickets, customers, loads }),
    [tickets, customers, loads]
  );

  const ticketCount = tickets.length;
  const technicianRequests = tickets.filter((ticket) => ticket.category === "Technician Request").length;
  const customerCount = customers.length;
  const recentCustomers = customers.slice(0, 4);
  const recentTickets = tickets.slice(0, 4);

  const content = (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          icon={TicketIcon}
          title="TOTAL TICKETS"
          value={loading ? "..." : ticketCount}
          caption="All user-submitted support tickets."
          accent="text-cignalRed"
        />
        <MetricCard
          icon={WrenchScrewdriverIcon}
          title="TECHNICIAN REQUESTS"
          value={loading ? "..." : technicianRequests}
          caption="Tickets flagged as technician request."
          accent="text-blue-600"
        />
        <MetricCard
          icon={UsersIcon}
          title="CUSTOMERS"
          value={loading ? "..." : customerCount}
          caption="Registered Descallar Satellite Services accounts."
          accent="text-cignalRed"
        />
        <ActionMetricCard onClick={() => navigate("/admin/customers")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1.15fr_0.95fr]">
        <CardShell title="Ticket Overview">
          <StatusOverview counts={statusCounts} />
        </CardShell>

        <CardShell title="Customer Growth">
          <GrowthChart data={customerGrowth} />
        </CardShell>

        <div className="rounded-[28px] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">AI Insights</h2>
          <div className="mt-5 space-y-5 border-b border-slate-200 pb-6 text-[15px] text-slate-800">
            <InsightBlock label="Top Issue" value={insights.topIssue} />
            <InsightBlock label="Recurring Concern" value={insights.repeatedConcern} />
            <InsightBlock label="Resolution Rate" value={`${insights.resolutionRate}%`} />
          </div>
          <div className="mt-5 rounded-[22px] bg-cignalRed p-4 text-white shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide">Recommendation</p>
            <p className="mt-2 text-base leading-7">{insights.recommendation}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <DataTableCard
          title="Recent Customers"
          columns={["Name", "Account No.", "CCA"]}
          rows={recentCustomers.map((customer) => [
            customer.accountName,
            customer.accountNumber,
            customer.ccaNumber,
          ])}
          emptyText="No customer records yet."
          actionLabel="View All"
          onAction={() => navigate("/admin/customers")}
        />

        <DataTableCard
          title="Recent Tickets"
          columns={["Ticket ID", "Subject", "Status"]}
          rows={recentTickets.map((ticket) => [
            `TCK-${ticket.id}`,
            ticket.subject,
            <StatusBadge key={ticket.id} status={ticket.status} />,
          ])}
          emptyText="No ticket records yet."
          actionLabel="View All"
          onAction={() => navigate("/admin/tickets")}
        />

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Business Snapshot</h2>
          <div className="mt-5 space-y-4">
            <MiniStat label="Logged Load Value" value={`PHP ${loads.reduce((sum, item) => sum + Number(item?.loadAmount || 0), 0).toFixed(2)}`} />
            <MiniStat label="Most Reported Category" value={categoryCounts[0]?.label || "No data yet"} />
            <MiniStat label="Customer Records" value={`${customerCount} active profiles`} />
          </div>
          <div className="mt-5 rounded-[22px] bg-slate-100 p-4 text-sm leading-7 text-slate-700">
            {insights.operationsSummary}
          </div>
        </div>
      </section>
    </div>
  );

  return embedded ? content : content;
}

function MetricCard({ icon: Icon, title, value, caption, accent }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 ${accent}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>{title}</p>
          <p className="mt-3 text-5xl font-bold leading-none text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{caption}</p>
    </div>
  );
}

function ActionMetricCard({ onClick }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <MagnifyingGlassCircleIcon className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-slate-950">CCA Inquiry</p>
          <button
            onClick={onClick}
            className="mt-4 w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cignalRed hover:text-cignalRed"
          >
            Lookup CCA / Account Info
          </button>
        </div>
      </div>
    </div>
  );
}

function CardShell({ title, children }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function StatusOverview({ counts }) {
  const total = Math.max(Object.values(counts).reduce((sum, value) => sum + value, 0), 1);

  return (
    <div className="space-y-4">
      {Object.entries(counts).map(([label, value]) => (
        <div key={label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">{label}</span>
            <span className="text-slate-500">{value}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${STATUS_COLORS[label] || "bg-slate-400"}`}
              style={{ width: `${Math.max((value / total) * 100, value ? 8 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GrowthChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div>
      <div className="flex h-52 items-end gap-4 border-b border-l border-dashed border-slate-200 px-4 pb-4 pt-6">
        {data.map((point) => (
          <div key={point.key} className="flex flex-1 flex-col items-center gap-3">
            <div className="text-sm font-semibold text-slate-500">{point.value}</div>
            <div className="flex h-32 items-end">
              <div
                className="w-10 rounded-t-2xl bg-gradient-to-t from-blue-500 to-blue-300"
                style={{ height: `${Math.max((point.value / max) * 120, point.value ? 16 : 4)}px` }}
              />
            </div>
            <span className="text-sm text-slate-700">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightBlock({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-base leading-7 text-slate-900">{value}</p>
    </div>
  );
}

function DataTableCard({ title, columns, rows, emptyText, actionLabel, onAction }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-4 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-4 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={onAction}
        className="mt-5 rounded-2xl bg-cignalRed px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const className =
    status === "Resolved"
      ? "bg-green-100 text-green-700"
      : status === "In Progress"
      ? "bg-amber-100 text-amber-700"
      : status === "Closed"
      ? "bg-slate-200 text-slate-700"
      : "bg-red-100 text-red-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );

  const [stats, setStats] = useState({
  pending: 0,
  approved: 0,
  rejected: 0
});

useEffect(() => {
  axios.get("/load-requests").then((res) => {
    const data = res.data.history || res.data;

    setStats({
      pending: data.filter(x => x.status === "pending").length,
      approved: data.filter(x => x.status === "approved").length,
      rejected: data.filter(x => x.status === "rejected").length
    });
  });
}, []);

}
