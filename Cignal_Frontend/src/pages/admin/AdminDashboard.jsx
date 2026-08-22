import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Lightbulb,
  MapPin,
  Siren,
  Ticket,
  Users,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import analyticsApi from '../../api/analyticsApi';

const LOCATIONS = ['', 'Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
const ISSUE_COLORS = ['#dc2626', '#f97316', '#f59e0b', '#2563eb', '#16a34a', '#7c3aed', '#64748b'];

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

function KpiCard({ icon: Icon, label, value, helper, tone }) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.red}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ icon: Icon, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-[#cc0000]" />}
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
          {action}
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    analyticsApi
      .getAdminAnalytics({ days: 30, location: location || undefined })
      .then((response) => active && setData(response.data))
      .catch((error) => console.error('DASHBOARD ANALYTICS ERROR:', error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [location]);

  const k = data?.kpis || {};
  const pendingTickets = Math.max(0, Number(k.totalTickets || 0) - Number(k.resolvedTickets || 0));
  const candidates = (data?.incidents || []).filter((item) => item.status === 'candidate');
  const activeIncidents = (data?.incidents || []).filter((item) => item.status === 'confirmed');
  const primaryIncident = candidates[0] || activeIncidents[0] || null;
  const topIssues = (data?.topIssues || []).slice(0, 5);
  const issueTotal = topIssues.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const locationRows = useMemo(
    () => [...(data?.locations || [])].sort((a, b) => Number(b.support || 0) - Number(a.support || 0)),
    [data]
  );
  const hotspot = useMemo(
    () => [...(data?.locations || [])].sort((a, b) => Number(b.supportPer100 || 0) - Number(a.supportPer100 || 0))[0],
    [data]
  );
  const resolutionRate = Number(k.resolutionRate || 0);
  const resolutionPie = [
    { name: 'Resolved', value: resolutionRate },
    { name: 'Pending', value: Math.max(0, 100 - resolutionRate) },
  ];

  const currentDate = new Date().toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-4 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Dashboard Overview</h1>
          <p className="mt-1 text-xs text-slate-500">Sales, subscriber support, and service operations at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
            {currentDate}
          </div>
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-red-300"
          >
            <option value="">All Locations</option>
            {LOCATIONS.filter(Boolean).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:text-[#cc0000]"
          >
            View Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={CreditCard} label="Sales Today" value={loading ? '...' : peso(k.salesToday)} helper="In-store POS revenue" tone="red" />
        <KpiCard icon={Ticket} label="Support Requests Today" value={loading ? '...' : k.supportToday || 0} helper="New subscriber tickets" tone="blue" />
        <KpiCard icon={CheckCircle2} label="Resolved Today" value={loading ? '...' : k.resolvedToday || 0} helper="Tickets resolved today" tone="green" />
        <KpiCard icon={Wrench} label="Technician Escalations" value={loading ? '...' : k.technicianEscalations || 0} helper="Requests in selected period" tone="amber" />
        <KpiCard icon={Clock3} label="Pending Concerns" value={loading ? '...' : pendingTickets} helper="Open support tickets" tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm xl:col-span-4">
          <CardTitle icon={AlertTriangle} title="Possible Common Issue / Incident" />
          {primaryIncident ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-white/80 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Siren size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                    {primaryIncident.status === 'candidate' ? 'Needs Admin Review' : 'Confirmed Active Incident'}
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">{primaryIncident.issue_label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{primaryIncident.location}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-red-50 p-3 text-xs">
                <div>
                  <p className="text-slate-400">Subscribers</p>
                  <p className="mt-1 font-black text-red-700">{primaryIncident.distinct_subscribers || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400">First detected</p>
                  <p className="mt-1 font-bold text-slate-700">{fmtDateTime(primaryIncident.first_reported_at || primaryIncident.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/incidents')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d60000] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#b90000]"
              >
                Review Incident <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 text-center">
              <CheckCircle2 size={28} className="text-emerald-500" />
              <p className="mt-3 text-sm font-black text-slate-800">No common issue detected</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">The system will flag a pattern when multiple distinct subscribers report the same specific issue in one location.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4">
          <CardTitle icon={Lightbulb} title="Smart Management Insights" action="View Analytics" onAction={() => navigate('/admin/analytics')} />
          <div className="mt-4 space-y-2.5">
            {(data?.insights || []).length ? (
              data.insights.slice(0, 5).map((insight, index) => {
                const tone = insight.severity === 'success'
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : insight.severity === 'warning'
                    ? 'border-amber-100 bg-amber-50 text-amber-700'
                    : 'border-blue-100 bg-blue-50 text-blue-700';
                return (
                  <div key={`${insight.title}-${index}`} className={`rounded-xl border p-3 ${tone}`}>
                    <div className="flex items-start gap-2">
                      <BarChart3 size={15} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black">{insight.title}</p>
                        <p className="mt-1 text-[11px] leading-5 opacity-80">{insight.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">Insights will appear as operational data accumulates.</div>
            )}
          </div>
          {hotspot && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-500"><MapPin size={14} /> Current hotspot</div>
              <b className="text-slate-800">{hotspot.location} · {hotspot.supportPer100}/100 subs</b>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4">
          <CardTitle title="Top Issue Today / Period" action="View Analytics" onAction={() => navigate('/admin/analytics')} />
          <div className="mt-2 grid min-h-64 grid-cols-1 items-center gap-2 sm:grid-cols-2">
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topIssues} dataKey="count" nameKey="label" innerRadius={54} outerRadius={76} paddingAngle={1}>
                    {topIssues.map((entry, index) => <Cell key={entry.label} fill={ISSUE_COLORS[index % ISSUE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                <span className="text-2xl font-black text-slate-900">{issueTotal}</span>
                <span className="text-[10px] text-slate-400">issues</span>
              </div>
            </div>
            <div className="space-y-2">
              {topIssues.length ? topIssues.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: ISSUE_COLORS[index % ISSUE_COLORS.length] }} />
                    <span className="truncate font-semibold text-slate-600">{item.label}</span>
                  </div>
                  <b className="shrink-0 text-slate-800">{item.count}</b>
                </div>
              )) : <p className="text-center text-xs text-slate-400">No support data yet.</p>}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <CardTitle title="Support Requests Trend" />
          <p className="mt-1 text-[11px] text-slate-400">Last 7 days · GMT+8</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trend || []} margin={{ top: 5, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="support" name="Support" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: '#dc2626' }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <CardTitle title="Requests by Location" />
          <p className="mt-1 text-[11px] text-slate-400">Support volume in selected period</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationRows} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="location" type="category" width={66} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="support" name="Support Requests" fill="#dc2626" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <CardTitle title="Resolution Rate" />
          <p className="mt-1 text-[11px] text-slate-400">Resolved vs open subscriber tickets</p>
          <div className="relative mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={resolutionPie} dataKey="value" innerRadius={72} outerRadius={94} startAngle={90} endAngle={-270}>
                  <Cell fill="#16a34a" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{resolutionRate}%</span>
              <span className="text-xs font-semibold text-slate-400">Resolved</span>
            </div>
          </div>
          <div className="flex justify-center gap-5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Resolved</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Pending</span>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4">
            <CardTitle title="Recent Tickets" action="View All" onAction={() => navigate('/admin/tickets')} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px]">
              <thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Ticket</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentTickets || []).slice(0, 5).map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-black text-blue-600">#{ticket.ticket_no || ticket.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{ticket.accountName || ticket.accountNumber || 'Subscriber'}</td>
                    <td className="max-w-40 truncate px-3 py-3 text-slate-600">{ticket.issue_label || ticket.category || 'Support Concern'}</td>
                    <td className="px-3 py-3 text-slate-500">{ticket.location || '—'}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-bold ${String(ticket.status).toLowerCase().includes('resolved') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{ticket.status || 'Open'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(data?.recentTickets || []).length && <p className="p-6 text-center text-xs text-slate-400">No recent tickets.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4">
            <CardTitle title="Recent Incidents / Outages" action="View All" onAction={() => navigate('/admin/incidents')} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px]">
              <thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Incident</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Reported</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.incidents || []).slice(0, 5).map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-black text-slate-700">INC-{String(incident.id).padStart(4, '0')}</td>
                    <td className="px-3 py-3 text-slate-600">{incident.location}</td>
                    <td className="max-w-40 truncate px-3 py-3 font-semibold text-slate-700">{incident.issue_label}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-bold ${incident.status === 'confirmed' ? 'bg-red-50 text-red-700' : incident.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : incident.status === 'candidate' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{incident.status}</span></td>
                    <td className="px-3 py-3 text-slate-500">{fmtDateTime(incident.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(data?.incidents || []).length && <p className="p-6 text-center text-xs text-slate-400">No incidents recorded.</p>}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[11px] text-blue-700">
        <span>Dashboard uses live system data. Times and day boundaries use Philippines time (GMT+8).</span>
        <span className="font-bold">Self-service success: {k.selfServiceResolutionRate || 0}%</span>
      </div>
    </div>
  );
}
