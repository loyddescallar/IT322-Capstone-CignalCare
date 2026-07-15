import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  User,
  Hash,
  Tv,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Banknote,
  ShieldCheck,
  Flag,
  CreditCard,
  Wrench,
  BrainCircuit,
  Pencil,
  Archive,
  RotateCcw,
  X,
  Save,
  ExternalLink,
} from 'lucide-react';

import customerApi from '../../api/customerApi';
import ticketApi from '../../api/ticketApi';
import axiosClient from '../../api/axiosClient';

const LOCATIONS = [
  'Balayan',
  'Calaca',
  'Lemery',
  'Calatagan',
  'Lian',
  'Nasugbu',
];

const EMPTY_FORM = {
  accountName: '',
  accountNumber: '',
  ccaNumber: '',
  address: '',
  phone: '',
  location: 'Balayan',
};

function displayTicketStatus(status) {
  const legacy = { Open: 'Submitted', 'In Progress': 'Under Review', Closed: 'Archived' };
  return legacy[status] || status || 'Submitted';
}

function sameValue(a, b) {
  return String(a ?? '') === String(b ?? '');
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function normalizeLocation(location) {
  const value = String(location || '').trim();

  if (!value) return '—';
  if (value.toLowerCase().includes('calaca')) return 'Calaca';

  return value;
}

function getRecordDate(record) {
  const raw =
    record?.created_at ||
    record?.createdAt ||
    record?.updated_at ||
    record?.completed_at ||
    record?.paid_at ||
    record?.date;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateValue) {
  if (!dateValue) return '—';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getActivityStatus(lastLoadDate) {
  if (!lastLoadDate) return 'Inactive';

  const date = new Date(lastLoadDate);

  if (Number.isNaN(date.getTime())) return 'Inactive';

  const days = (Date.now() - date.getTime()) / 86400000;

  if (days <= 30) return 'Active';
  if (days <= 60) return 'At Risk';

  return 'Inactive';
}

function isTicketOpen(ticket) {
  return !['resolved', 'archived', 'completed', 'rejected'].includes(
    normalizeStatus(ticket?.status)
  );
}

function isTechOpen(request) {
  return !['completed', 'cancelled', 'canceled', 'rejected'].includes(
    normalizeStatus(request?.status)
  );
}

function getLoadAmount(transaction) {
  return (
    Number(
      transaction?.loadAmount ??
        transaction?.amount ??
        transaction?.plan_amount ??
        transaction?.price ??
        transaction?.total ??
        0
    ) || 0
  );
}

function getPlanLabel(transaction) {
  const sourceText = [
    transaction?.description,
    transaction?.planName,
    transaction?.plan_name,
    transaction?.plan,
    transaction?.packageName,
  ]
    .filter(Boolean)
    .join(' ');

  const match = sourceText.match(/Load\s*(\d+)/i);

  if (match) return `Load ${match[1]}`;

  return (
    transaction?.description ||
    transaction?.planName ||
    transaction?.plan_name ||
    transaction?.plan ||
    'Prepaid Load'
  );
}

function computeSmartRisk(lastLoadDate, activeTickets, openTechReqs, archived) {
  if (archived) {
    return {
      risk: 0,
      level: 'ARCHIVED',
      reason:
        'This customer is archived. History remains available, but the account is not part of active operations.',
    };
  }

  let risk = 10;
  const reasons = [];
  const status = getActivityStatus(lastLoadDate);

  if (status === 'Inactive') {
    risk += 40;
    reasons.push('no reload in 60+ days');
  } else if (status === 'At Risk') {
    risk += 25;
    reasons.push('31–60 days without reload');
  }

  if (activeTickets > 0) {
    risk += activeTickets * 12;
    reasons.push(
      `${activeTickets} active ticket${activeTickets > 1 ? 's' : ''}`
    );
  }

  if (openTechReqs > 0) {
    risk += openTechReqs * 10;
    reasons.push(
      `${openTechReqs} pending tech request${openTechReqs > 1 ? 's' : ''}`
    );
  }

  risk = Math.min(risk, 95);

  const reason = reasons.length
    ? `${reasons.join('; ')}.`
    : status === 'Active'
      ? 'Active subscription, no open issues.'
      : 'No significant risk signals.';

  return {
    risk,
    level: risk >= 70 ? 'HIGH' : risk >= 40 ? 'MEDIUM' : 'LOW',
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
  };
}

const ticketCfg = {
  Submitted: {
    classes: 'bg-red-100 text-red-700',
    Icon: Flag,
  },
  'Under Review': {
    classes: 'bg-amber-100 text-amber-700',
    Icon: Clock,
  },
  'Job Order Assigned': {
    classes: 'bg-blue-100 text-blue-700',
    Icon: Wrench,
  },
  Resolved: {
    classes: 'bg-green-100 text-green-700',
    Icon: CheckCircle2,
  },
  Archived: {
    classes: 'bg-slate-100 text-slate-600',
    Icon: Archive,
  },
};

const activityStyles = {
  Active: {
    badge: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  'At Risk': {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  Inactive: {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export default function AdminCustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [techReqs, setTechReqs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('transactions');
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);

    try {
      const customerRes = await customerApi.getCustomerById(id);
      const loadedCustomer = customerRes.data?.customer;

      setCustomer(loadedCustomer || null);

      if (!loadedCustomer) return;

      const [ticketRes, techRes, loadRes] = await Promise.all([
        ticketApi.getAdminTickets().catch(() => ({ data: { tickets: [] } })),
        axiosClient
          .get('/technicians/requests/admin')
          .catch(() => ({ data: { requests: [] } })),
        axiosClient.get('/load/admin').catch(() => ({ data: { history: [] } })),
      ]);

      const allTickets = ticketRes.data?.tickets || [];
      const allTechReqs = techRes.data?.requests || [];
      const allTransactions = loadRes.data?.history || [];

      setTickets(
        allTickets.filter(
          (ticket) =>
            sameValue(ticket.user_id, loadedCustomer.id) ||
            sameValue(ticket.accountNumber, loadedCustomer.accountNumber)
        )
      );

      setTechReqs(
        allTechReqs.filter(
          (request) =>
            sameValue(request.user_id, loadedCustomer.id) ||
            sameValue(request.accountNumber, loadedCustomer.accountNumber)
        )
      );

      setTransactions(
        allTransactions.filter((transaction) =>
          sameValue(transaction.accountNumber, loadedCustomer.accountNumber)
        )
      );
    } catch (error) {
      console.error('CUSTOMER PROFILE LOAD ERROR:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isArchived = normalizeStatus(customer?.status) === 'archived';
  const actStatus = getActivityStatus(customer?.lastLoadDate);
  const actStyle = activityStyles[actStatus] || activityStyles.Inactive;

  const activeTickets = useMemo(
    () => tickets.filter(isTicketOpen).length,
    [tickets]
  );

  const openTechReqs = useMemo(
    () => techReqs.filter(isTechOpen).length,
    [techReqs]
  );

  const smartRisk = useMemo(
    () =>
      computeSmartRisk(
        customer?.lastLoadDate,
        activeTickets,
        openTechReqs,
        isArchived
      ),
    [customer?.lastLoadDate, activeTickets, openTechReqs, isArchived]
  );

  const totalSpent = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) => sum + getLoadAmount(transaction),
        0
      ),
    [transactions]
  );

  const spendByMonth = useMemo(() => {
    const monthMap = {};

    transactions.forEach((transaction) => {
      const date = getRecordDate(transaction);

      if (!date) return;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      const label = date.toLocaleDateString('en-PH', { month: 'short' });

      monthMap[key] = {
        label,
        value: (monthMap[key]?.value || 0) + getLoadAmount(transaction),
      };
    });

    return Object.entries(monthMap)
      .sort()
      .slice(-6)
      .map(([, value]) => value);
  }, [transactions]);

  const riskColor = isArchived
    ? 'text-slate-600 bg-slate-50 border-slate-200'
    : smartRisk.risk >= 70
      ? 'text-red-600 bg-red-50 border-red-200'
      : smartRisk.risk >= 40
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-green-600 bg-green-50 border-green-200';

  const riskBar = isArchived
    ? 'bg-slate-400'
    : smartRisk.risk >= 70
      ? 'bg-red-500'
      : smartRisk.risk >= 40
        ? 'bg-amber-400'
        : 'bg-green-400';

  function openEditModal() {
    if (!customer || isArchived) return;

    setFormErr('');
    setForm({
      accountName: customer.accountName || '',
      accountNumber: customer.accountNumber || '',
      ccaNumber: customer.ccaNumber || '',
      address: customer.address || '',
      phone: customer.phone || '',
      location: normalizeLocation(customer.location) || 'Balayan',
    });
    setMode('edit');
  }

  function closeModal() {
    setMode(null);
    setFormErr('');
    setSaving(false);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!form.accountName.trim()) return 'Account name is required.';
    if (!form.accountNumber.trim()) return 'Account number is required.';
    if (!form.ccaNumber.trim()) return 'CCA number is required.';
    if (!form.location.trim()) return 'Coverage location is required.';

    if (form.accountNumber.trim().length < 5) {
      return 'Account number looks too short.';
    }

    if (form.phone.trim() && form.phone.trim().length < 7) {
      return 'Phone number looks too short.';
    }

    return '';
  }

  async function handleUpdateCustomer() {
    const validationError = validateForm();

    if (validationError) {
      setFormErr(validationError);
      return;
    }

    setSaving(true);

    try {
      await customerApi.updateCustomer(customer.id, {
        ...form,
        location: normalizeLocation(form.location),
      });

      closeModal();
      await loadProfile();
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to update customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveCustomer() {
    if (!customer || isArchived) return;

    setSaving(true);

    try {
      if (typeof customerApi.archiveCustomer === 'function') {
        await customerApi.archiveCustomer(customer.id);
      } else {
        await customerApi.deleteCustomer(customer.id);
      }

      closeModal();
      await loadProfile();
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to archive customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreCustomer() {
    if (!customer || !isArchived) return;

    setSaving(true);

    try {
      await customerApi.restoreCustomer(customer.id);
      closeModal();
      await loadProfile();
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to restore customer.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#cc0000] border-t-transparent" />
          <p className="text-sm">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-400">
        <User size={32} className="mb-3 opacity-30" />
        <p className="text-sm">Customer not found.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/customers')}
          className="mt-3 text-xs text-[#cc0000] hover:underline"
        >
          ← Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#cc0000]"
      >
        <ArrowLeft size={13} /> Back to Customers
      </button>

      {isArchived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Archive size={15} className="mt-0.5 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-amber-800">
                Archived Customer Record
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                This account is currently archived. You can still view its
                history, but editing and archiving are disabled until it is
                restored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={`${isArchived ? 'bg-slate-400' : 'bg-[#cc0000]'} h-2`} />

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white ${
              isArchived ? 'bg-slate-500' : 'bg-[#cc0000]'
            }`}
          >
            {customer.accountName?.[0]?.toUpperCase() || 'C'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {customer.accountName}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Hash size={11} className="text-slate-400" />
                    <span className="font-mono text-xs text-slate-600">
                      {customer.accountNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <ShieldCheck size={11} className="text-[#cc0000]" />
                    <span className="text-xs text-slate-600">
                      {customer.ccaNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Phone size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-600">
                      {customer.phone || 'No phone'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-600">
                      {customer.address || normalizeLocation(customer.location)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isArchived ? (
                  <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    <Archive size={11} />
                    Archived
                  </span>
                ) : (
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${actStyle.badge}`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${actStyle.dot}`} />
                    {actStatus}
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {normalizeLocation(customer.location)} · Since{' '}
                  {formatDate(customer.created_at)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!isArchived && (
                <>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#cc0000]/30 hover:bg-red-50 hover:text-[#cc0000]"
                  >
                    <Pencil size={13} />
                    Edit Customer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormErr('');
                      setMode('archive');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    <Archive size={13} />
                    Archive
                  </button>
                </>
              )}

              {isArchived && (
                <button
                  type="button"
                  onClick={() => {
                    setFormErr('');
                    setMode('restore');
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                >
                  <RotateCcw size={13} />
                  Restore Customer
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/admin/tickets')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ExternalLink size={13} />
                View Tickets
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Total Load Spend',
            value: `₱${totalSpent.toLocaleString()}`,
            sub: `${transactions.length} transaction${
              transactions.length === 1 ? '' : 's'
            }`,
            color: 'text-[#cc0000]',
            icon: <CreditCard size={13} className="text-[#cc0000]" />,
          },
          {
            label: 'Total Tickets',
            value: tickets.length,
            sub: `${activeTickets} active`,
            color: 'text-slate-800',
            icon: <Flag size={13} className="text-purple-500" />,
          },
          {
            label: 'Service Jobs',
            value: techReqs.length,
            sub: `${openTechReqs} pending`,
            color: 'text-slate-800',
            icon: <Wrench size={13} className="text-blue-500" />,
          },
          {
            label: 'Smart Risk Level',
            value: isArchived ? 'Archived' : `${smartRisk.risk}%`,
            sub: smartRisk.level,
            color: isArchived
              ? 'text-slate-600'
              : smartRisk.risk >= 70
                ? 'text-red-600'
                : smartRisk.risk >= 40
                  ? 'text-amber-600'
                  : 'text-green-600',
            icon: <BrainCircuit size={13} className="text-[#cc0000]" />,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-1 flex items-center gap-2">
              {item.icon}
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>

            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {/* Tabs */}
          <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
            {[
              {
                key: 'transactions',
                label: 'Transactions',
                Icon: CreditCard,
                count: transactions.length,
              },
              {
                key: 'tickets',
                label: 'Tickets',
                Icon: Flag,
                count: tickets.length,
              },
              {
                key: 'service',
                label: 'Service',
                Icon: Wrench,
                count: techReqs.length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-[#cc0000] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.Icon size={12} />
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 font-bold ${
                    activeTab === tab.key
                      ? 'bg-red-100 text-[#cc0000]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                  style={{ fontSize: '10px' }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 pb-3 pt-4">
              <h2 className="text-sm font-semibold text-slate-700">
                {activeTab === 'transactions'
                  ? 'Load History'
                  : activeTab === 'tickets'
                    ? 'Ticket History'
                    : 'Service History'}
              </h2>
            </div>

            {activeTab === 'transactions' &&
              (transactions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No load transactions recorded for this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id || index}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          ₱{getLoadAmount(transaction).toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {getPlanLabel(transaction)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(
                            transaction.created_at ||
                              transaction.completed_at ||
                              transaction.paid_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          normalizeStatus(transaction.status) === 'completed'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {transaction.status || 'completed'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === 'tickets' &&
              (tickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No support tickets recorded for this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {tickets.map((ticket) => {
                    const ticketStatus = displayTicketStatus(ticket.status);
                    const cfg = ticketCfg[ticketStatus] || ticketCfg.Submitted;

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/admin/chat/${ticket.id}`)}
                        className="flex cursor-pointer items-start justify-between gap-2 px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {ticket.subject || 'Support Ticket'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {ticket.category || 'General'} · #{ticket.id}
                          </p>
                        </div>

                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.classes}`}
                        >
                          <cfg.Icon size={10} />
                          {displayTicketStatus(ticket.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}

            {activeTab === 'service' &&
              (techReqs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No technician service records for this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {techReqs.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between gap-2 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {request.issueDescription ||
                            request.issue_type ||
                            request.concern ||
                            'Technician service request'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(request.created_at)}
                          {request.technician_name
                            ? ` · ${request.technician_name}`
                            : ''}
                        </p>
                      </div>

                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          normalizeStatus(request.status) === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : normalizeStatus(request.status) === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : ['cancelled', 'canceled'].includes(
                                    normalizeStatus(request.status)
                                  )
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {request.status === 'Pending' ? 'Submitted' : request.status || 'Submitted'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Smart Insight */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BrainCircuit size={14} className="text-[#cc0000]" />
              <h2 className="text-sm font-semibold text-slate-700">
                Smart Insight
              </h2>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                Rule-based
              </span>
            </div>

            <div className={`mb-3 rounded-xl border p-3 ${riskColor}`}>
              <p className="mb-0.5 text-xs font-bold">
                {isArchived
                  ? 'Archived Record'
                  : `Risk Level: ${smartRisk.risk}% — ${smartRisk.level}`}
              </p>
              <p className="text-xs leading-snug opacity-80">
                {smartRisk.reason}
              </p>

              {!isArchived && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/40">
                  <div
                    className={`h-full rounded-full ${riskBar}`}
                    style={{ width: `${smartRisk.risk}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {activeTickets > 0 && !isArchived && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-2">
                  <AlertTriangle
                    size={11}
                    className="mt-0.5 text-red-500"
                  />
                  <p className="text-xs text-red-700">
                    {activeTickets} active ticket
                    {activeTickets > 1 ? 's' : ''} — prioritize resolution.
                  </p>
                </div>
              )}

              {openTechReqs > 0 && !isArchived && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2">
                  <Wrench size={11} className="mt-0.5 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    {openTechReqs} pending tech request
                    {openTechReqs > 1 ? 's' : ''} — confirm dispatch.
                  </p>
                </div>
              )}

              {(activeTickets === 0 || isArchived) &&
                (openTechReqs === 0 || isArchived) && (
                  <div className="flex items-start gap-2 rounded-xl bg-green-50 p-2">
                    <CheckCircle2
                      size={11}
                      className="mt-0.5 text-green-500"
                    />
                    <p className="text-xs text-green-700">
                      {isArchived
                        ? 'Historical records are preserved for admin review.'
                        : 'No active issues. Strong retention candidate.'}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Spend Timeline */}
          {spendByMonth.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard size={13} className="text-[#cc0000]" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Load Spend Timeline
                </h2>
              </div>

              <div className="flex h-24 items-end gap-1.5 border-b border-l border-dashed border-slate-200 pb-2 pl-2">
                {spendByMonth.map((month, index) => {
                  const maxValue = Math.max(
                    ...spendByMonth.map((item) => item.value),
                    1
                  );

                  return (
                    <div
                      key={`${month.label}-${index}`}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-slate-400" style={{ fontSize: '8px' }}>
                        ₱{Number(month.value).toLocaleString()}
                      </span>

                      <div className="flex h-16 w-full items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#cc0000] to-red-400"
                          style={{
                            height: `${Math.max(
                              (month.value / maxValue) * 60,
                              4
                            )}px`,
                          }}
                        />
                      </div>

                      <span className="text-slate-500" style={{ fontSize: '9px' }}>
                        {month.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <User size={11} className="text-[#cc0000]" /> Account Details
            </p>

            {[
              {
                label: 'Record Status',
                value: isArchived ? 'Archived' : 'Active Record',
                Icon: Archive,
              },
              {
                label: 'Account No.',
                value: customer.accountNumber,
                Icon: Hash,
              },
              {
                label: 'CCA No.',
                value: customer.ccaNumber,
                Icon: ShieldCheck,
              },
              {
                label: 'Phone',
                value: customer.phone || '—',
                Icon: Phone,
              },
              {
                label: 'Location',
                value: normalizeLocation(customer.location),
                Icon: MapPin,
              },
              {
                label: 'Since',
                value: formatDate(customer.created_at),
                Icon: Calendar,
              },
              {
                label: 'Last Load',
                value: customer.lastLoadDate
                  ? formatDate(customer.lastLoadDate)
                  : 'No record',
                Icon: Tv,
              },
              {
                label: 'Activity',
                value: isArchived ? 'Archived' : actStatus,
                Icon: Banknote,
              },
            ].map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <field.Icon size={10} className="text-slate-300" />
                  <p className="text-xs text-slate-400">{field.label}</p>
                </div>

                <p className="text-right text-xs font-semibold text-slate-800">
                  {field.value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {mode === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">
                Edit Customer
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {formErr && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Account Name *',
                    name: 'accountName',
                  },
                  {
                    label: 'Account Number *',
                    name: 'accountNumber',
                  },
                  {
                    label: 'CCA Number *',
                    name: 'ccaNumber',
                  },
                  {
                    label: 'Phone',
                    name: 'phone',
                  },
                ].map((field) => (
                  <div key={field.name}>
                    <label
                      className="mb-1 block text-xs font-medium text-gray-500"
                      style={{ fontSize: '10px' }}
                    >
                      {field.label}
                    </label>

                    <input
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label
                    className="mb-1 block text-xs font-medium text-gray-500"
                    style={{ fontSize: '10px' }}
                  >
                    Address
                  </label>

                  <input
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="e.g. Brgy. Caloocan, Balayan, Batangas"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                  />
                </div>

                <div className="col-span-2">
                  <label
                    className="mb-1 block text-xs font-medium text-gray-500"
                    style={{ fontSize: '10px' }}
                  >
                    Coverage Location *
                  </label>

                  <select
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdateCustomer}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#cc0000] py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {mode === 'archive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">
                Archive Customer
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {formErr && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formErr}
                </div>
              )}

              <p className="text-xs leading-relaxed text-gray-600">
                Archive{' '}
                <span className="font-semibold">{customer.accountName}</span>{' '}
                ({customer.accountNumber})? This will hide the customer from
                active lists while preserving tickets, load history, and service
                records.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleArchiveCustomer}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {saving ? 'Archiving...' : 'Archive'}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {mode === 'restore' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">
                Restore Customer
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {formErr && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formErr}
                </div>
              )}

              <p className="text-xs leading-relaxed text-gray-600">
                Restore{' '}
                <span className="font-semibold">{customer.accountName}</span>{' '}
                ({customer.accountNumber}) to the active customer records?
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleRestoreCustomer}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? 'Restoring...' : 'Restore'}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}