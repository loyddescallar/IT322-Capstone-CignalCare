import { useEffect, useMemo, useState } from "react";
import ticketApi from "../api/ticketApi";
import customerApi from "../api/customerApi";
import loadAdminApi from "../api/loadAdminApi";
import {
  buildDashboardInsights,
  buildMonthlySeries,
  summarizeTicketsByCategory,
  summarizeTicketsByStatus,
} from "../utils/adminInsights";

export default function AdminAnalytics({ embedded = false }) {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
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
        console.error("ADMIN ANALYTICS ERROR", err);
        if (active) setError("Failed to load analytics data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

  const statusCounts = useMemo(() => summarizeTicketsByStatus(tickets), [tickets]);
  const categoryCounts = useMemo(() => summarizeTicketsByCategory(tickets), [tickets]);
  const customerSeries = useMemo(() => buildMonthlySeries(customers), [customers]);
  const loadSeries = useMemo(() => buildMonthlySeries(loads), [loads]);
  const insights = useMemo(
    () => buildDashboardInsights({ tickets, customers, loads }),
    [tickets, customers, loads]
  );

  const totalRevenue = loads.reduce((sum, item) => sum + Number(item?.loadAmount || 0), 0);

  const content = (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Revenue" value={loading ? "..." : `PHP ${totalRevenue.toFixed(2)}`} />
        <MetricCard label="Loads Processed" value={loading ? "..." : loads.length} />
        <MetricCard label="Active Accounts" value={loading ? "..." : customers.length} />
        <MetricCard label="Open Tickets" value={loading ? "..." : statusCounts.Open} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Ticket Status Distribution">
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span className="text-slate-500">{value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cignalRed"
                    style={{ width: `${Math.max((value / Math.max(tickets.length, 1)) * 100, value ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top Ticket Categories">
          <div className="space-y-4">
            {categoryCounts.length === 0 ? (
              <p className="text-sm text-slate-400">No ticket category data yet.</p>
            ) : (
              categoryCounts.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.95fr]">
        <Panel title="Customer Growth">
          <SimpleTrend data={customerSeries} colorClass="bg-blue-500" />
        </Panel>

        <Panel title="Load Activity">
          <SimpleTrend data={loadSeries} colorClass="bg-amber-500" />
        </Panel>

        <div className="rounded-[28px] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">AI Summary</h2>
          <div className="mt-5 space-y-5 text-sm leading-7 text-slate-700">
            <SummaryRow label="Top issue" value={insights.topIssue} />
            <SummaryRow label="Repeated concern" value={insights.repeatedConcern} />
            <SummaryRow label="Operations" value={insights.operationsSummary} />
          </div>
          <div className="mt-5 rounded-[22px] bg-cignalRed p-4 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide">Recommended next action</p>
            <p className="mt-2 text-base leading-7">{insights.recommendation}</p>
          </div>
        </div>
      </section>
    </div>
  );

  return embedded ? content : content;
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cignalRed">{label}</p>
      <p className="mt-3 text-4xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SimpleTrend({ data, colorClass }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-52 items-end gap-4 border-b border-l border-dashed border-slate-200 px-4 pb-4 pt-6">
      {data.map((point) => (
        <div key={point.key} className="flex flex-1 flex-col items-center gap-3">
          <div className="text-sm font-semibold text-slate-500">{point.value}</div>
          <div className="flex h-32 items-end">
            <div
              className={`w-10 rounded-t-2xl ${colorClass}`}
              style={{ height: `${Math.max((point.value / max) * 120, point.value ? 16 : 4)}px` }}
            />
          </div>
          <span className="text-sm text-slate-700">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-900">{value}</p>
    </div>
  );
}
