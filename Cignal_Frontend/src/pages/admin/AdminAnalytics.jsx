import { useEffect, useMemo, useState } from 'react';
import {
  ChartNoAxesCombined,
  CheckCircle2,
  Download,
  MapPin,
  Store,
  Headset,
  Users,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import analyticsApi from '../../api/analyticsApi';

const LOCATIONS = ['', 'Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
const TABS = [
  ['overview', 'Overview'],
  ['sales', 'Sales Analytics'],
  ['support', 'Subscriber Support'],
  ['service', 'Technician / Service'],
];
const COLORS = ['#dc2626', '#f97316', '#f59e0b', '#2563eb', '#16a34a', '#7c3aed'];

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Metric({ icon: Icon, label, value, sub, tone = 'red' }) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.red}`}><Icon size={18} /></div>}
        <div>
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-[11px] leading-5 text-slate-400">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HorizontalBars({ items, labelKey = 'label', valueKey = 'count', format = (v) => v, tone = '#dc2626' }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  if (!items.length) return <p className="py-8 text-center text-xs text-slate-400">No data in this period.</p>;

  return (
    <div className="space-y-3.5">
      {items.map((item, index) => (
        <div key={`${item[labelKey]}-${index}`}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-slate-600">{item[labelKey]}</span>
            <b className="text-slate-800">{format(item[valueKey])}</b>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (Number(item[valueKey] || 0) / max) * 100)}%`, backgroundColor: tone }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState('overview');
  const [days, setDays] = useState('30');
  const [location, setLocation] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    analyticsApi
      .getAdminAnalytics({ days, location: location || undefined })
      .then((response) => active && setData(response.data))
      .catch((error) => console.error('ADMIN ANALYTICS ERROR:', error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [days, location]);

  const k = data?.kpis || {};
  const locations = useMemo(
    () => [...(data?.locations || [])].sort((a, b) => Number(b.supportPer100 || 0) - Number(a.supportPer100 || 0)),
    [data]
  );
  const topIssues = (data?.topIssues || []).slice(0, 6);
  const issueTotal = topIssues.reduce((sum, item) => sum + Number(item.count || 0), 0);

  const exportCsv = () => {
    const rows = [
      ['CignalCare+ Business Analytics'],
      ['Period', `${days} days`],
      ['Location', location || 'All Locations'],
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['POS Revenue', k.totalRevenue || 0],
      ['POS Transactions', k.posTransactions || 0],
      ['Active Subscribers', k.activeSubscribers || 0],
      ['Support Tickets', k.totalTickets || 0],
      ['Resolution Rate', `${k.resolutionRate || 0}%`],
      ['Self-Service Resolution', `${k.selfServiceResolutionRate || 0}%`],
      ['Repeat Contact Rate', `${k.repeatContactRate || 0}%`],
      [],
      ['TOP ISSUES'],
      ['Issue', 'Reports'],
      ...(data?.topIssues || []).map((item) => [item.label, item.count]),
      [],
      ['LOCATION SUPPORT'],
      ['Location', 'Subscribers', 'Support', 'Support per 100'],
      ...(data?.locations || []).map((item) => [item.location, item.subscribers, item.support, item.supportPer100]),
      [],
      ['TROUBLESHOOTING GUIDE PERFORMANCE'],
      ['Guide', 'Resolved', 'Unresolved', 'Resolution Rate'],
      ...(data?.guidePerformance || []).map((item) => [item.guide, item.resolved, item.unresolved, `${item.resolutionRate}%`]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cignalcare-business-analytics-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Business Analytics</h1>
          <p className="mt-1 text-xs text-slate-500">Turn sales and subscriber-support records into management decisions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={days} onChange={(e) => setDays(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 12 Months</option>
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <option value="">All Locations</option>
            {LOCATIONS.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-[#d60000] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#b90000]">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === key ? 'bg-[#d60000] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Loading analytics...</div>}

      {!loading && tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={Store} label="POS Revenue" value={peso(k.totalRevenue)} sub={`${k.posTransactions || 0} in-store transactions`} tone="red" />
            <Metric icon={Users} label="Active Subscribers" value={k.activeSubscribers || 0} sub={location || 'Across all locations'} tone="blue" />
            <Metric icon={Headset} label="Support Tickets" value={k.totalTickets || 0} sub={`${k.resolutionRate || 0}% resolved`} tone="amber" />
            <Metric icon={CheckCircle2} label="Self-Service Success" value={`${k.selfServiceResolutionRate || 0}%`} sub={`${k.selfServiceAssessments || 0} completed assessments`} tone="green" />
            <Metric icon={Wrench} label="Technician Demand" value={data?.technician?.total || 0} sub="Service requests in period" tone="violet" />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <Section title="Sales & Support Trend" subtitle="Seven-day comparison of in-store sales and subscriber support activity." className="xl:col-span-7">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.trend || []} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="supportGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity={0.24} /><stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} /></linearGradient>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value, name) => name === 'POS Revenue' ? peso(value) : value} />
                    <Area yAxisId="left" type="monotone" dataKey="support" name="Support Requests" stroke="#dc2626" fill="url(#supportGradient)" strokeWidth={2.4} />
                    <Area yAxisId="right" type="monotone" dataKey="sales" name="POS Revenue" stroke="#2563eb" fill="url(#salesGradient)" strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Top Subscriber Issues" subtitle="Most reported concerns in the selected period." className="xl:col-span-5">
              <div className="grid min-h-72 grid-cols-1 items-center sm:grid-cols-2">
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topIssues} dataKey="count" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={1}>
                        {topIssues.map((item, index) => <Cell key={item.label} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Reports</span>
                    <span className="text-3xl font-bold text-slate-900">{issueTotal}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {topIssues.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate font-semibold text-slate-600">{item.label}</span></div>
                      <b>{item.count}</b>
                    </div>
                  ))}
                  {!topIssues.length && <p className="text-xs text-slate-400">No issue data yet.</p>}
                </div>
              </div>
            </Section>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Section title="Support Hotspots" subtitle="Normalized by active subscriber count so larger locations are not unfairly ranked.">
              <HorizontalBars items={locations} labelKey="location" valueKey="supportPer100" format={(v) => `${v}/100`} />
            </Section>
            <Section title="Smart Management Insights" subtitle="Automatically generated from current system records.">
              <div className="space-y-2.5">
                {(data?.insights || []).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.text}</p>
                  </div>
                ))}
                {!(data?.insights || []).length && <p className="py-6 text-center text-xs text-slate-400">No management insight available yet.</p>}
              </div>
            </Section>
            <Section title="Incident Status" subtitle="Only Admin-confirmed incidents become customer advisories.">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase text-amber-600">Needs Review</p><p className="mt-1 text-3xl font-bold text-amber-800">{k.incidentCandidates || 0}</p></div>
                <div className="rounded-xl bg-red-50 p-4"><p className="text-[10px] font-bold uppercase text-red-600">Active</p><p className="mt-1 text-3xl font-bold text-red-800">{k.activeIncidents || 0}</p></div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">Common-issue detection requires multiple distinct subscribers reporting the same specific issue in the same location.</div>
            </Section>
          </div>
        </div>
      )}

      {!loading && tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Store} label="POS Revenue" value={peso(k.totalRevenue)} sub="In-store sales only" tone="red" />
            <Metric icon={ChartNoAxesCombined} label="Transactions" value={k.posTransactions || 0} sub="Completed POS transactions" tone="blue" />
            <Metric icon={MapPin} label="Locations" value={(data?.salesByLocation || []).length} sub="Locations with POS sales" tone="green" />
            <Metric icon={Store} label="Average Sale" value={peso((k.totalRevenue || 0) / Math.max(1, k.posTransactions || 0))} sub="Revenue per POS transaction" tone="amber" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="POS Revenue Trend" subtitle="In-store POS revenue only; online PayMongo load requests are excluded.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.trend || []} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => peso(value)} />
                    <Area type="monotone" dataKey="sales" name="POS Revenue" stroke="#dc2626" fill="#fee2e2" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Revenue by Location" subtitle="Compare where in-store sales are generated.">
              <HorizontalBars items={data?.salesByLocation || []} labelKey="location" valueKey="revenue" format={peso} />
            </Section>
            <Section title="Top-Selling Plans / Products" subtitle="Ranked by revenue from completed in-store POS transactions." className="xl:col-span-2">
              <div className="grid gap-3 lg:grid-cols-2">
                <HorizontalBars items={data?.salesByPlan || []} valueKey="revenue" format={peso} />
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2.5">Plan / Product</th><th className="px-3 py-2.5">Transactions</th><th className="px-3 py-2.5">Revenue</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{(data?.salesByPlan || []).slice(0, 8).map((row) => <tr key={row.label}><td className="px-3 py-3 font-semibold text-slate-700">{row.label}</td><td className="px-3 py-3 text-slate-500">{row.count}</td><td className="px-3 py-3 font-bold text-slate-800">{peso(row.revenue)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </Section>
          </div>
        </div>
      )}

      {!loading && tab === 'support' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={CheckCircle2} label="Resolution Rate" value={`${k.resolutionRate || 0}%`} sub={`${k.totalTickets || 0} support tickets`} tone="green" />
            <Metric icon={Users} label="Self-Service Success" value={`${k.selfServiceResolutionRate || 0}%`} sub="Verified troubleshooting outcomes" tone="blue" />
            <Metric icon={Headset} label="Repeat Contact Rate" value={`${k.repeatContactRate || 0}%`} sub="Subscribers with 2+ tickets" tone="amber" />
            <Metric icon={ChartNoAxesCombined} label="Average Resolution" value={`${k.avgResolutionHours || 0} hrs`} sub="Resolved ticket turnaround" tone="violet" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Most Common Subscriber Problems" subtitle="Use this to prioritize troubleshooting content, staff training, and service improvements.">
              <HorizontalBars items={data?.topIssues || []} />
            </Section>
            <Section title="Location Hotspots" subtitle="Support interactions per 100 active subscribers—not raw counts alone.">
              <HorizontalBars items={locations} labelKey="location" valueKey="supportPer100" format={(v) => `${v} / 100 subscribers`} />
            </Section>
            <Section title="Troubleshooting Guide Performance" subtitle="Measured directly from the existing “Did these steps solve the problem?” customer flow." className="xl:col-span-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Guide</th><th className="px-3 py-3">Resolved</th><th className="px-3 py-3">Unresolved</th><th className="px-3 py-3">Success Rate</th><th className="px-3 py-3">Decision Signal</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.guidePerformance || []).map((row) => {
                      const healthy = Number(row.resolutionRate || 0) >= 60;
                      return <tr key={row.guide}><td className="max-w-md px-3 py-3 font-semibold text-slate-700">{row.guide}</td><td className="px-3 py-3 text-emerald-700">{row.resolved}</td><td className="px-3 py-3 text-amber-700">{row.unresolved}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-bold ${healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.resolutionRate}%</span></td><td className="px-3 py-3 text-[11px] text-slate-500">{healthy ? 'Guide is resolving most assessed cases.' : 'Review guide content or escalation path.'}</td></tr>;
                    })}
                  </tbody>
                </table>
                {!(data?.guidePerformance || []).length && <p className="py-8 text-center text-xs text-slate-400">No troubleshooting outcomes recorded yet.</p>}
              </div>
            </Section>
          </div>
        </div>
      )}

      {!loading && tab === 'service' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Wrench} label="Technician Requests" value={data?.technician?.total || 0} sub="Selected period" tone="red" />
            <Metric icon={CheckCircle2} label="Completed" value={data?.technician?.completed || 0} sub="Service completed" tone="green" />
            <Metric icon={ChartNoAxesCombined} label="Scheduled" value={data?.technician?.scheduled || 0} sub="Currently scheduled" tone="blue" />
            <Metric icon={Headset} label="Pending Review" value={data?.technician?.pending || 0} sub="Submitted / under review" tone="amber" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Service Demand by Location" subtitle="Helps management allocate technician capacity based on actual request volume.">
              <HorizontalBars items={[...(data?.locations || [])].sort((a, b) => Number(b.technicians || 0) - Number(a.technicians || 0))} labelKey="location" valueKey="technicians" />
            </Section>
            <Section title="Service Decision Context" subtitle="Operational signals that connect subscriber support and technician work.">
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Technician escalation after troubleshooting</p><p className="mt-1 text-2xl font-bold text-slate-900">{k.technicianSelfServiceEscalations || 0}</p><p className="mt-1 text-[11px] text-slate-500">Customers who escalated from verified troubleshooting to a technician request.</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ticket escalation after troubleshooting</p><p className="mt-1 text-2xl font-bold text-slate-900">{k.ticketEscalations || 0}</p><p className="mt-1 text-[11px] text-slate-500">Customers who escalated from troubleshooting to a support ticket.</p></div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Active service incidents</p><p className="mt-1 text-2xl font-bold text-red-800">{k.activeIncidents || 0}</p><p className="mt-1 text-[11px] text-red-600">Confirmed incidents should be reviewed before unnecessary individual dispatches.</p></div>
              </div>
            </Section>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[11px] text-blue-700">Analytics uses live CignalCare+ records and Philippines time (GMT+8). Location filters apply to supported metrics.</div>
    </div>
  );
}
