import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Package,
  Lightbulb,
  AlertCircle,
  MapPin,
  ChevronRight,
  Wrench,
  Ticket,
  CreditCard,
  Smartphone,
  Clock,
  Activity,
  UserPlus,
  MessageSquare,
} from 'lucide-react';

import ticketApi from '../../api/ticketApi';
import customerApi from '../../api/customerApi';
import loadAdminApi from '../../api/loadAdminApi';
import { getAllLoadRequests } from '../../api/loadRequestApi';
import technicianApi from '../../api/technicianApi';

const PLAN_COLORS = {
  'Load 200': '#f87171',
  'Load 300': '#fb923c',
  'Load 450': '#fbbf24',
  'Load 500': '#34d399',
  'Load 600': '#60a5fa',
  'Load 800': '#a78bfa',
  'Load 1000': '#cc0000',
  Other: '#94a3b8',
};

const LOC_COLORS = [
  '#cc0000',
  '#fb923c',
  '#fbbf24',
  '#34d399',
  '#60a5fa',
  '#a78bfa',
];

const LOCATIONS = [
  'Balayan',
  'Calaca',
  'Lemery',
  'Calatagan',
  'Lian',
  'Nasugbu',
];

function getArray(payload, key) {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload)) return payload;
  return [];
}

function getRecordDate(record) {
  const raw =
    record?.created_at ||
    record?.createdAt ||
    record?.completed_at ||
    record?.paid_at ||
    record?.updated_at ||
    record?.date;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatActivityTime(date) {
  if (!date) return 'No date';

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
}

function getLoadAmount(load) {
  return (
    Number(
      load?.loadAmount ??
        load?.amount ??
        load?.plan_amount ??
        load?.price ??
        load?.total ??
        0
    ) || 0
  );
}

function getPlanLabel(load) {
  const sourceText = [
    load?.description,
    load?.planName,
    load?.plan_name,
    load?.plan,
    load?.packageName,
  ]
    .filter(Boolean)
    .join(' ');

  const match = sourceText.match(/Load\s*(\d+)/i);

  if (match) return `Load ${match[1]}`;
  return load?.planName || load?.plan_name || load?.plan || 'Other';
}

function normalizeLocation(location) {
  const value = String(location || '').trim();

  if (!value) return 'Unknown';
  if (value.toLowerCase().includes('calaca')) return 'Calaca';

  const found = LOCATIONS.find(
    (loc) => loc.toLowerCase() === value.toLowerCase()
  );

  return found || value;
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isFinishedStatus(status) {
  const value = normalizeStatus(status);
  return ['completed', 'rejected', 'cancelled', 'canceled', 'closed'].includes(
    value
  );
}

function isPaidRequest(request) {
  return normalizeStatus(request?.payment_status) === 'paid';
}

function isPayMongoRequest(request) {
  const source = [
    request?.payment_method,
    request?.payment_type,
    request?.payment_channel,
    request?.payment_source,
    request?.paymongo_checkout_session_id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return source.includes('paymongo') || source.includes('checkout');
}

function getActivityStatus(lastLoadDate) {
  if (!lastLoadDate) return 'Inactive';

  const days =
    (Date.now() - new Date(lastLoadDate).getTime()) / 86400000;

  if (days <= 30) return 'Active';
  if (days <= 60) return 'At Risk';

  return 'Inactive';
}

function summarizeTicketStatuses(tickets) {
  const counts = {
    Submitted: 0,
    'Under Review': 0,
    'Job Order Assigned': 0,
    Resolved: 0,
    Archived: 0,
  };

  tickets.forEach((ticket) => {
    const status = normalizeStatus(ticket?.status);

    if (['submitted', 'open'].includes(status)) {
      counts.Submitted += 1;
    } else if (['under review', 'in progress', 'attending', 'pending'].includes(status)) {
      counts['Under Review'] += 1;
    } else if (['job order assigned', 'scheduled'].includes(status)) {
      counts['Job Order Assigned'] += 1;
    } else if (['resolved', 'completed'].includes(status)) {
      counts.Resolved += 1;
    } else if (['archived', 'closed', 'cancelled', 'canceled'].includes(status)) {
      counts.Archived += 1;
    } else {
      counts.Submitted += 1;
    }
  });

  return counts;
}

function buildRevenueSeries(loads) {
  const now = new Date();

  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      key: getMonthKey(date),
      month: date.toLocaleString('en-PH', { month: 'short' }),
      revenue: 0,
      count: 0,
    };
  });

  loads.forEach((load) => {
    const date = getRecordDate(load);
    if (!date) return;

    const key = getMonthKey(date);
    const month = months.find((item) => item.key === key);

    if (month) {
      month.revenue += getLoadAmount(load);
      month.count += 1;
    }
  });

  return months;
}

function KpiCard({ iconBg, icon, label, value, sub, trend, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${
        onClick
          ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-[#cc0000]/30 hover:shadow-md'
          : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="pr-2 text-xs font-medium leading-tight text-gray-500">
          {label}
        </p>

        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold leading-tight text-gray-800">{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-gray-400">{sub}</p>

      {trend && <div className="mt-2 text-xs">{trend}</div>}
    </div>
  );
}

function ActionCard({ icon, label, value, sub, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#cc0000]/30 hover:shadow-md"
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
        <p className="truncate text-[10px] text-gray-400">{sub}</p>
      </div>

      <ChevronRight size={14} className="text-gray-300" />
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-7 text-gray-400">
      <CheckCircle2 size={24} className="mb-2 text-green-400" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loadRequests, setLoadReqs] = useState([]);
  const [techRequests, setTechReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setLoading(true);

      try {
        const [ticketRes, customerRes, loadRes, loadRequestRes, techRes] =
          await Promise.all([
            ticketApi.getAdminTickets(),
            customerApi.getCustomers(),
            loadAdminApi.getAll(),
            getAllLoadRequests().catch(() => ({ data: [] })),
            technicianApi
              .getAdminRequests()
              .catch(() => ({ data: { requests: [] } })),
          ]);

        if (!active) return;

        setTickets(getArray(ticketRes.data, 'tickets'));
        setCustomers(getArray(customerRes.data, 'customers'));
        setLoads(getArray(loadRes.data, 'history'));
        setLoadReqs(getArray(loadRequestRes.data, 'requests'));
        setTechReqs(getArray(techRes.data, 'requests'));
      } catch (error) {
        console.error('ADMIN DASHBOARD LOAD ERROR:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const supportTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          String(ticket?.category || '').toLowerCase() !==
          'technician request'
      ),
    [tickets]
  );

  const statusCounts = useMemo(
    () => summarizeTicketStatuses(supportTickets),
    [supportTickets]
  );

  const todayLoads = useMemo(() => {
    const today = new Date().toDateString();

    return loads.filter((load) => {
      const date = getRecordDate(load);
      return date && date.toDateString() === today;
    });
  }, [loads]);

  const totalRevenue = useMemo(
    () => loads.reduce((sum, load) => sum + getLoadAmount(load), 0),
    [loads]
  );

  const currentMonthKey = getMonthKey(new Date());

  const newThisMonth = useMemo(
    () =>
      customers.filter((customer) => {
        const date = getRecordDate(customer);
        return date && getMonthKey(date) === currentMonthKey;
      }).length,
    [customers, currentMonthKey]
  );

  const atRisk = useMemo(
    () =>
      customers.filter(
        (customer) => getActivityStatus(customer.lastLoadDate) === 'At Risk'
      ),
    [customers]
  );

  const activeCount = useMemo(
    () =>
      customers.filter(
        (customer) => getActivityStatus(customer.lastLoadDate) === 'Active'
      ).length,
    [customers]
  );

  const inactiveCount = Math.max(
    customers.length - activeCount - atRisk.length,
    0
  );

  const submittedTickets = supportTickets.filter(
    (ticket) => ['submitted', 'open'].includes(normalizeStatus(ticket.status))
  ).length;

  const pendingTech = techRequests.filter(
    (request) => !isFinishedStatus(request.status)
  ).length;

  const pendingRemote = loadRequests.filter(
    (request) => !isFinishedStatus(request.status)
  );

  const paidPendingRemote = loadRequests.filter(
    (request) => isPaidRequest(request) && !isFinishedStatus(request.status)
  );

  const unpaidPayMongo = loadRequests.filter(
    (request) =>
      isPayMongoRequest(request) &&
      !isPaidRequest(request) &&
      !isFinishedStatus(request.status)
  );

  const completedRemote = loadRequests.filter(
    (request) => normalizeStatus(request.status) === 'completed'
  );

  const pendingActions =
    submittedTickets + pendingTech + pendingRemote.length;

  const revenueTrend = useMemo(() => buildRevenueSeries(loads), [loads]);

  const sixMonthRevenue = revenueTrend.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const previousRevenue =
    revenueTrend.length >= 2
      ? revenueTrend[revenueTrend.length - 2].revenue
      : 0;

  const currentRevenue =
    revenueTrend.length >= 1
      ? revenueTrend[revenueTrend.length - 1].revenue
      : 0;

  const revenueTrendText =
    currentRevenue >= previousRevenue
      ? 'Revenue stable or growing'
      : 'Revenue lower this month';

  const ticketStatusData = [
    {
      name: 'Submitted',
      count: statusCounts.Submitted,
      color: '#f87171',
    },
    {
      name: 'Under Review',
      count: statusCounts['Under Review'],
      color: '#fbbf24',
    },
    {
      name: 'Job Order Assigned',
      count: statusCounts['Job Order Assigned'],
      color: '#60a5fa',
    },
    {
      name: 'Resolved',
      count: statusCounts.Resolved,
      color: '#34d399',
    },
    {
      name: 'Archived',
      count: statusCounts.Archived,
      color: '#94a3b8',
    },
  ];

  const planPopData = useMemo(() => {
    const planMap = {};

    loads.forEach((load) => {
      const plan = getPlanLabel(load);
      planMap[plan] = (planMap[plan] || 0) + 1;
    });

    return Object.entries(planMap)
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
  }, [loads]);

  const subsPerLocation = useMemo(
    () =>
      LOCATIONS.map((location, index) => ({
        location,
        count: customers.filter(
          (customer) => normalizeLocation(customer.location) === location
        ).length,
        color: LOC_COLORS[index],
      })),
    [customers]
  );

  const recentActivities = useMemo(() => {
    const activities = [];

    customers.forEach((customer) => {
      const date = getRecordDate(customer);
      if (!date) return;

      activities.push({
        id: `customer-${customer.id}`,
        icon: UserPlus,
        title: 'New subscriber registered',
        desc: customer.accountName || 'Customer account created',
        time: date,
        path: '/admin/customers',
        color: 'bg-blue-100 text-blue-600',
      });
    });

    supportTickets.forEach((ticket) => {
      const date = getRecordDate(ticket);
      if (!date) return;

      activities.push({
        id: `ticket-${ticket.id}`,
        icon: MessageSquare,
        title: 'Support ticket created',
        desc: ticket.subject || ticket.category || 'New support concern',
        time: date,
        path: '/admin/tickets',
        color: 'bg-orange-100 text-orange-600',
      });
    });

    techRequests.forEach((request) => {
      const date = getRecordDate(request);
      if (!date) return;

      activities.push({
        id: `tech-${request.id}`,
        icon: Wrench,
        title: 'Technician request submitted',
        desc: request.issue_type || request.concern || 'Service assistance needed',
        time: date,
        path: '/admin/technicians',
        color: 'bg-amber-100 text-amber-600',
      });
    });

    loadRequests.forEach((request) => {
      const date = getRecordDate(request);
      if (!date) return;

      activities.push({
        id: `load-request-${request.id}`,
        icon: Smartphone,
        title: isPaidRequest(request)
          ? 'Paid remote load request'
          : 'Remote load request submitted',
        desc:
          request.plan_name ||
          request.planName ||
          request.package_name ||
          request.reference_no ||
          'Load request',
        time: date,
        path: '/admin/load-requests',
        color: 'bg-purple-100 text-purple-600',
      });
    });

    loads.forEach((load) => {
      const date = getRecordDate(load);
      if (!date) return;

      activities.push({
        id: `load-${load.id || `${date.getTime()}-${getPlanLabel(load)}`}`,
        icon: CreditCard,
        title: 'Load transaction processed',
        desc: `${getPlanLabel(load)} · ₱${getLoadAmount(load).toLocaleString()}`,
        time: date,
        path: '/admin/transactions',
        color: 'bg-green-100 text-green-600',
      });
    });

    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 6);
  }, [customers, supportTickets, techRequests, loadRequests, loads]);

  const smartInsights = useMemo(() => {
    const items = [];

    if (atRisk.length > 0) {
      items.push({
        text: `${atRisk.length} account${
          atRisk.length > 1 ? 's are' : ' is'
        } at risk. Consider sending a reload reminder or follow-up message.`,
        type: 'warning',
      });
    }

    if (unpaidPayMongo.length > 0) {
      items.push({
        text: `${unpaidPayMongo.length} PayMongo request${
          unpaidPayMongo.length > 1 ? 's are' : ' is'
        } still waiting for payment confirmation.`,
        type: 'warning',
      });
    }

    if (paidPendingRemote.length > 0) {
      items.push({
        text: `${paidPendingRemote.length} paid load request${
          paidPendingRemote.length > 1 ? 's need' : ' needs'
        } admin processing.`,
        type: 'warning',
      });
    }

    if (pendingTech > 0) {
      items.push({
        text: `${pendingTech} technician request${
          pendingTech > 1 ? 's are' : ' is'
        } waiting for scheduling or completion.`,
        type: 'warning',
      });
    }

    if (submittedTickets > 0) {
      items.push({
        text: `${submittedTickets} submitted ticket${
          submittedTickets > 1 ? 's need' : ' needs'
        } admin review.`,
        type: 'warning',
      });
    }

    if (totalRevenue > 0) {
      items.push({
        text: `Total load revenue is ₱${totalRevenue.toLocaleString()}. Continue monitoring reload activity and at-risk subscribers.`,
        type: 'info',
      });
    }

    if (activeCount > 0) {
      items.push({
        text: `${activeCount} subscriber account${
          activeCount > 1 ? 's are' : ' is'
        } currently active.`,
        type: 'success',
      });
    }

    if (items.length === 0) {
      items.push({
        text: 'All systems normal. No urgent admin action required at this time.',
        type: 'success',
      });
    }

    return items;
  }, [
    atRisk.length,
    unpaidPayMongo.length,
    paidPendingRemote.length,
    pendingTech,
    submittedTickets,
    totalRevenue,
    activeCount,
  ]);

  const goToPendingAction = () => {
    if (submittedTickets > 0) {
      navigate('/admin/tickets');
      return;
    }

    if (pendingTech > 0) {
      navigate('/admin/technicians');
      return;
    }

    navigate('/admin/load-requests');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#cc0000] border-t-transparent" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          iconBg="bg-blue-100"
          icon={<Users size={17} className="text-blue-500" />}
          label="Total Subscribers"
          value={customers.length.toString()}
          sub={`Across all ${LOCATIONS.length} coverage areas`}
          trend={
            <span className="flex items-center gap-0.5 text-green-600">
              <ArrowUpRight size={12} />
              {newThisMonth} new this month
            </span>
          }
          onClick={() => navigate('/admin/customers')}
        />

        <KpiCard
          iconBg="bg-green-100"
          icon={<CreditCard size={17} className="text-green-600" />}
          label="Total Revenue"
          value={`₱${totalRevenue.toLocaleString()}`}
          sub={`${loads.length} processed load transaction${
            loads.length === 1 ? '' : 's'
          }`}
          trend={
            <span className="flex items-center gap-0.5 text-green-600">
              <TrendingUp size={12} />
              Actual load revenue
            </span>
          }
          onClick={() => navigate('/admin/transactions')}
        />

        <KpiCard
          iconBg="bg-red-100"
          icon={<CheckCircle2 size={17} className="text-[#cc0000]" />}
          label="Active Accounts"
          value={activeCount.toString()}
          sub={`${atRisk.length} at risk · ${inactiveCount} inactive`}
          trend={
            atRisk.length > 0 ? (
              <span className="flex items-center gap-0.5 text-amber-500">
                <AlertTriangle size={12} />
                {atRisk.length} need attention
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-green-600">
                <ArrowUpRight size={12} />
                Accounts healthy
              </span>
            )
          }
          onClick={() => navigate('/admin/customers')}
        />

        <KpiCard
          iconBg="bg-amber-100"
          icon={<Wrench size={17} className="text-amber-500" />}
          label="Pending Requests"
          value={pendingActions.toString()}
          sub={`${submittedTickets} submitted · ${pendingTech} tech · ${pendingRemote.length} loads`}
          trend={
            pendingActions > 0 ? (
              <span className="flex items-center gap-0.5 text-blue-500">
                <AlertCircle size={12} />
                Needs attention
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-green-600">
                <CheckCircle2 size={12} />
                Clear queue
              </span>
            )
          }
          onClick={goToPendingAction}
        />
      </div>

      {/* Action Queue */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionCard
          icon={<Ticket size={15} className="text-orange-500" />}
          label="Submitted Tickets"
          value={submittedTickets}
          sub="Waiting for admin review"
          color="bg-orange-100"
          onClick={() => navigate('/admin/tickets')}
        />

        <ActionCard
          icon={<Wrench size={15} className="text-amber-500" />}
          label="Tech Requests"
          value={pendingTech}
          sub="Pending service visits"
          color="bg-amber-100"
          onClick={() => navigate('/admin/technicians')}
        />

        <ActionCard
          icon={<Smartphone size={15} className="text-purple-500" />}
          label="Paid Loads"
          value={paidPendingRemote.length}
          sub="Ready to process"
          color="bg-purple-100"
          onClick={() => navigate('/admin/load-requests')}
        />

        <ActionCard
          icon={<AlertTriangle size={15} className="text-[#cc0000]" />}
          label="Pending Payments"
          value={unpaidPayMongo.length}
          sub="PayMongo not confirmed"
          color="bg-red-100"
          onClick={() => navigate('/admin/load-requests')}
        />
      </div>

      {/* Load Source Breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: <TrendingUp size={15} className="text-blue-500" />,
            bg: 'bg-blue-100',
            label: "Today's Loads",
            value: todayLoads.length,
            sub: 'Processed today',
            clickPath: '/admin/transactions',
          },
          {
            icon: <Package size={15} className="text-[#cc0000]" />,
            bg: 'bg-red-100',
            label: 'Remote Requests',
            value: loadRequests.length,
            sub: 'Total submitted',
            clickPath: '/admin/load-requests',
          },
          {
            icon: <CheckCircle2 size={15} className="text-green-500" />,
            bg: 'bg-green-100',
            label: 'Completed Loads',
            value: completedRemote.length,
            sub: 'Remote completed',
            clickPath: '/admin/load-requests',
          },
          {
            icon: <AlertTriangle size={15} className="text-amber-500" />,
            bg: 'bg-amber-100',
            label: 'Pending Remote',
            value: pendingRemote.length,
            sub: 'Awaiting action',
            clickPath: '/admin/load-requests',
          },
        ].map((summary) => (
          <div
            key={summary.label}
            onClick={() => navigate(summary.clickPath)}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cc0000]/30 hover:shadow-md"
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${summary.bg}`}
            >
              {summary.icon}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {summary.label}
              </p>
              <p className="text-lg font-bold text-gray-800">
                {summary.value}
              </p>
              <p className="text-[10px] text-gray-400">{summary.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Monthly Revenue Trend
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Actual 6-month load transaction revenue
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400">6-Month Total</p>
            <p className="text-base font-bold text-gray-800">
              ₱{sixMonthRevenue.toLocaleString()}
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-green-600">
              <TrendingUp size={11} />
              <span>{revenueTrendText}</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={148}>
          <AreaChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value, name, item) => [
                `₱${Number(value).toLocaleString()}`,
                `Revenue · ${item.payload.count} load${
                  item.payload.count === 1 ? '' : 's'
                }`,
              ]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#cc0000"
              strokeWidth={2.5}
              fill="#cc0000"
              fillOpacity={0.1}
              activeDot={{
                r: 4,
                fill: '#cc0000',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Plan Popularity + Ticket Status */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <Package size={15} className="text-purple-500" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Plan Popularity
              </h2>
              <p className="text-xs text-gray-400">
                Based on processed load transactions
              </p>
            </div>
          </div>

          {planPopData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={120} height={120}>
                <Pie
                  data={planPopData}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {planPopData.map((entry) => (
                    <Cell
                      key={entry.plan}
                      fill={PLAN_COLORS[entry.plan] || PLAN_COLORS.Other}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} loads`, name]}
                  contentStyle={{
                    fontSize: 10,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                />
              </PieChart>

              <div className="flex-1 space-y-1.5">
                {planPopData.slice(0, 5).map((plan) => {
                  const maxCount = Math.max(
                    ...planPopData.map((item) => item.count)
                  );

                  return (
                    <div
                      key={plan.plan}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              PLAN_COLORS[plan.plan] || PLAN_COLORS.Other,
                          }}
                        />
                        <span className="text-xs text-gray-600">
                          {plan.plan}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(plan.count / maxCount) * 100}%`,
                              backgroundColor:
                                PLAN_COLORS[plan.plan] || PLAN_COLORS.Other,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-gray-700">
                          {plan.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-gray-400">
              No transactions yet. Process a POS or remote load to see plan
              popularity.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <Ticket size={15} className="text-orange-500" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Ticket Status Distribution
              </h2>
              <p className="text-xs text-gray-400">
                {supportTickets.length} total support ticket
                {supportTickets.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={ticketStatusData}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value) => [`${value} tickets`]}
                contentStyle={{
                  fontSize: 10,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar
                dataKey="count"
                barSize={16}
                shape={(props) => {
                  const { x, y, width, height, index } = props;
                  const safeWidth = Math.max(width, 0);

                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={safeWidth}
                        height={height}
                        fill={ticketStatusData[index]?.color || '#cc0000'}
                        rx={4}
                      />
                      <text
                        x={x + safeWidth + 6}
                        y={y + height / 2}
                        dominantBaseline="middle"
                        fontSize={10}
                        fill="#374151"
                        fontWeight={600}
                      >
                        {ticketStatusData[index]?.count}
                      </text>
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>

          <button
            type="button"
            onClick={() => navigate('/admin/tickets')}
            className="mt-2 flex w-full items-center justify-center gap-0.5 text-xs text-[#cc0000] hover:underline"
          >
            Manage All Tickets <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Subscribers per Location + At-Risk */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <MapPin size={15} className="text-blue-500" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Subscribers per Location
              </h2>
              <p className="text-xs text-gray-400">
                {customers.length} total across {LOCATIONS.length} service areas
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={148}>
            <BarChart
              data={subsPerLocation}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="location"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value) => [`${value} subscribers`]}
                contentStyle={{
                  fontSize: 10,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar
                dataKey="count"
                barSize={14}
                shape={(props) => {
                  const { x, y, width, height, index } = props;
                  const safeWidth = Math.max(width, 0);

                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={safeWidth}
                        height={height}
                        fill={subsPerLocation[index]?.color || '#cc0000'}
                        rx={4}
                      />
                      <text
                        x={x + safeWidth + 6}
                        y={y + height / 2}
                        dominantBaseline="middle"
                        fontSize={10}
                        fill="#374151"
                        fontWeight={600}
                      >
                        {subsPerLocation[index]?.count}
                      </text>
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle size={15} className="text-amber-500" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                At-Risk Subscribers
              </h2>
              <p className="text-xs text-gray-400">
                {atRisk.length} account{atRisk.length === 1 ? '' : 's'} may
                lapse — 31–60 days without reload
              </p>
            </div>
          </div>

          {atRisk.length === 0 ? (
            <EmptyState text="All accounts are active or already handled." />
          ) : (
            <div className="space-y-2">
              {atRisk.slice(0, 5).map((customer) => {
                const daysAgo = customer.lastLoadDate
                  ? Math.floor(
                      (Date.now() -
                        new Date(customer.lastLoadDate).getTime()) /
                        86400000
                    )
                  : null;

                const daysLeft = daysAgo ? 60 - daysAgo : null;

                return (
                  <div
                    key={customer.id}
                    onClick={() => navigate(`/admin/customers/${customer.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 transition-colors hover:bg-amber-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
                        <span className="text-xs font-bold text-amber-700">
                          {customer.accountName?.charAt(0)}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {customer.accountName}
                        </p>
                        <p className="text-gray-400" style={{ fontSize: '10px' }}>
                          {normalizeLocation(customer.location)} · Last load:{' '}
                          {customer.lastLoadDate
                            ? new Date(customer.lastLoadDate).toLocaleDateString(
                                'en-PH'
                              )
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {daysLeft !== null ? `${daysLeft}d left` : 'At Risk'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            className="mt-2 flex w-full items-center justify-center gap-0.5 text-xs text-[#cc0000] hover:underline"
          >
            View All Customers <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Activity size={15} className="text-slate-600" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Recent Activity
            </h2>
            <p className="text-xs text-gray-400">
              Latest customer, ticket, technician, and load movements
            </p>
          </div>
        </div>

        {recentActivities.length === 0 ? (
          <EmptyState text="No recent activity yet." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => navigate(activity.path)}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-[#cc0000]/20 hover:bg-red-50/40"
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${activity.color}`}
                  >
                    <Icon size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {activity.desc}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1 text-[10px] text-gray-400">
                    <Clock size={10} />
                    {formatActivityTime(activity.time)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Smart Recommendations */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
            <Lightbulb size={15} className="text-yellow-500" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Smart Recommendations
            </h2>
            <p className="text-xs text-gray-400">
              Prescriptive insights based on current system data
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {smartInsights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
                insight.type === 'warning'
                  ? 'border-amber-100 bg-amber-50'
                  : insight.type === 'success'
                    ? 'border-green-100 bg-green-50'
                    : 'border-blue-100 bg-blue-50'
              }`}
            >
              {insight.type === 'warning' ? (
                <AlertTriangle
                  size={13}
                  className="mt-0.5 flex-shrink-0 text-amber-500"
                />
              ) : insight.type === 'success' ? (
                <CheckCircle2
                  size={13}
                  className="mt-0.5 flex-shrink-0 text-green-500"
                />
              ) : (
                <AlertCircle
                  size={13}
                  className="mt-0.5 flex-shrink-0 text-blue-500"
                />
              )}

              <p
                className={`text-xs leading-relaxed ${
                  insight.type === 'warning'
                    ? 'text-amber-800'
                    : insight.type === 'success'
                      ? 'text-green-800'
                      : 'text-blue-800'
                }`}
              >
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}