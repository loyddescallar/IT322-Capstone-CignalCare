import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Pencil,
  X,
  Users,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Archive,
  RotateCcw,
  Upload,
  KeyRound,
  Download,
} from 'lucide-react';
import customerApi from '../../api/customerApi';

const LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
const ACTIVITY_FILTERS = ['All', 'Active', 'At Risk', 'Inactive'];
const EMPTY = {
  accountName: '',
  accountNumber: '',
  ccaNumber: '',
  address: '',
  phone: '',
  email: '',
  location: 'Balayan',
};

const actStyle = {
  Active: {
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    icon: <CheckCircle2 size={10} className="text-green-600" />,
  },
  'At Risk': {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    icon: <AlertTriangle size={10} className="text-amber-500" />,
  },
  Inactive: {
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
    icon: <XCircle size={10} className="text-gray-400" />,
  },
  Archived: {
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    icon: <Archive size={10} className="text-red-600" />,
  },
};

function normalizeLocation(location) {
  const value = String(location || '').trim();
  if (!value) return '—';
  if (value.toLowerCase().includes('calaca')) return 'Calaca';

  const match = LOCATIONS.find((loc) => loc.toLowerCase() === value.toLowerCase());
  return match || value;
}

function getActivityStatus(lastLoadDate) {
  if (!lastLoadDate) return 'Inactive';

  const parsed = new Date(lastLoadDate);
  if (Number.isNaN(parsed.getTime())) return 'Inactive';

  const days = (Date.now() - parsed.getTime()) / 86400000;
  if (days <= 30) return 'Active';
  if (days <= 60) return 'At Risk';
  return 'Inactive';
}

function getCustomerStatus(customer) {
  if (String(customer?.status || '').toLowerCase() === 'archived') return 'Archived';
  return getActivityStatus(customer?.lastLoadDate);
}

function safeDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH');
}

function maskEmail(value) {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return '—';

  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function validateCustomerForm(form, enforceIdentifiers = true) {
  if (!form.accountName.trim()) return 'Account name is required.';
  if (!form.accountNumber.trim()) return 'Account number is required.';
  if (!form.ccaNumber.trim()) return 'CCA number is required.';
  if (enforceIdentifiers && !/^\d{1,9}$/.test(form.accountNumber.trim())) return 'Account Number must contain digits only and be at most 9 digits.';
  if (enforceIdentifiers && !/^\d{1,11}$/.test(form.ccaNumber.trim())) return 'CCA Number must contain digits only and be at most 11 digits.';
  if (!form.address.trim()) return 'Address is required.';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email format is invalid.';
  if (!LOCATIONS.includes(form.location)) return 'Please select a valid coverage location.';

  if (form.phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim())) {
    return 'Phone number format is invalid.';
  }

  return '';
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs leading-tight text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SmallActionButton({ title, icon, children, className, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${className}`}
    >
      {icon}
      <span className="hidden xl:inline">{children}</span>
    </button>
  );
}

export default function AdminCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    activeCount: 0,
    atRiskCount: 0,
    inactiveCount: 0,
    archivedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locTab, setLocTab] = useState('All');
  const [activityTab, setActivityTab] = useState('All');
  const [recordStatus, setRecordStatus] = useState('active');
  const [ccaQ, setCcaQ] = useState('');
  const [ccaResult, setCcaResult] = useState(null);
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLocation, setImportLocation] = useState('Balayan');
  const [importPreview, setImportPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState('');
  const [importCredentials, setImportCredentials] = useState([]);

  const loadData = async (status = recordStatus) => {
    setLoading(true);
    try {
      const [customerRes, statsRes] = await Promise.all([
        customerApi.getCustomers(status),
        customerApi.getStats(),
      ]);

      setCustomers(customerRes.data?.customers || []);
      setStats(statsRes.data?.stats || {});
    } catch (error) {
      console.error('CUSTOMER PAGE LOAD ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(recordStatus);
    setCcaResult(null);
    setCcaQ('');
  }, [recordStatus]);

  const displayedCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const location = normalizeLocation(customer.location);
      const activity = getActivityStatus(customer.lastLoadDate);

      const matchesLocation = locTab === 'All' || location === locTab;
      const matchesActivity =
        recordStatus === 'archived' || activityTab === 'All' || activity === activityTab;
      const matchesSearch =
        !query ||
        String(customer.accountName || '').toLowerCase().includes(query) ||
        String(customer.accountNumber || '').toLowerCase().includes(query) ||
        String(customer.ccaNumber || '').toLowerCase().includes(query) ||
        String(customer.phone || '').toLowerCase().includes(query) ||
        String(customer.email || '').toLowerCase().includes(query) ||
        String(customer.address || '').toLowerCase().includes(query) ||
        String(customer.location || '').toLowerCase().includes(query);

      return matchesLocation && matchesActivity && matchesSearch;
    });
  }, [customers, search, locTab, activityTab, recordStatus]);

  const locationCounts = useMemo(() => {
    return LOCATIONS.reduce((acc, location) => {
      acc[location] = customers.filter(
        (customer) => normalizeLocation(customer.location) === location
      ).length;
      return acc;
    }, {});
  }, [customers]);

  const openModal = (nextMode, customer = null) => {
    setMode(nextMode);
    setSelected(customer);
    setFormErr('');

    if (nextMode === 'edit' && customer) {
      setForm({
        accountName: customer.accountName || '',
        accountNumber: customer.accountNumber || '',
        ccaNumber: customer.ccaNumber || '',
        address: customer.address || '',
        phone: customer.phone || '',
        email: customer.email || '',
        location: normalizeLocation(customer.location) === '—' ? 'Balayan' : normalizeLocation(customer.location),
      });
    } else if (nextMode === 'add') {
      setForm({ ...EMPTY });
    }
  };

  const closeModal = () => {
    setMode(null);
    setSelected(null);
    setFormErr('');
    setSaving(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const saveCustomer = async () => {
    const validationError = validateCustomerForm(form, mode === 'add');
    if (validationError) {
      setFormErr(validationError);
      return;
    }

    setSaving(true);
    setFormErr('');

    try {
      const payload = {
        ...form,
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ccaNumber: form.ccaNumber.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };

      if (mode === 'add') {
        const response = await customerApi.createCustomer(payload);
        setIssuedCredentials(response.data?.credentials || null);
      } else {
        await customerApi.updateCustomer(selected.id, payload);
      }

      if (mode !== 'add') closeModal();
      await loadData(recordStatus);
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCredentials = async (customer) => {
    try {
      const response = await customerApi.resetCredentials(customer.id);
      setIssuedCredentials(response.data?.credentials || null);
      setSelected(customer);
      setMode('credentials');
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Unable to generate credentials.');
    }
  };

  const previewSubscriberImport = async () => {
    if (!importFile) { setImportError('Choose an .xlsx file first.'); return; }
    setImportBusy(true); setImportError(''); setImportPreview(null); setImportCredentials([]);
    try {
      const response = await customerApi.previewImport(importFile, importLocation);
      setImportPreview(response.data);
    } catch (error) {
      setImportError(error.response?.data?.error || 'Unable to preview the Excel file.');
    } finally { setImportBusy(false); }
  };

  const confirmSubscriberImport = async () => {
    if (!importFile || !importPreview?.summary?.valid) return;
    setImportBusy(true); setImportError('');
    try {
      const response = await customerApi.importSubscribers(importFile, importLocation);
      setImportCredentials(response.data?.credentials || []);
      setImportPreview(null);
      await loadData(recordStatus);
    } catch (error) {
      setImportError(error.response?.data?.error || 'Unable to import subscribers.');
    } finally { setImportBusy(false); }
  };

  const downloadCredentialsCsv = () => {
    if (!importCredentials.length) return;
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Name', 'Account Number', 'Temporary Password', 'Recovery Code', 'Temporary Password Expires At', 'Location'].join(','),
      ...importCredentials.map((item) => [item.accountName, item.accountNumber, item.temporaryPassword, item.recoveryCode, item.temporaryPasswordExpiresAt, item.location].map(escape).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cignalcare-temporary-credentials-${importLocation.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleArchive = async () => {
    if (!selected) return;

    setSaving(true);
    setFormErr('');

    try {
      await customerApi.archiveCustomer(selected.id);
      if (mode !== 'add') closeModal();
      await loadData(recordStatus);
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to archive customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!selected) return;

    setSaving(true);
    setFormErr('');

    try {
      await customerApi.restoreCustomer(selected.id);
      if (mode !== 'add') closeModal();
      await loadData(recordStatus);
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to restore customer.');
    } finally {
      setSaving(false);
    }
  };


  const handleCcaSearch = (event) => {
    event.preventDefault();
    const query = ccaQ.trim().toLowerCase();
    if (!query) return;

    const found = customers.find(
      (customer) =>
        String(customer.accountNumber || '').toLowerCase() === query ||
        String(customer.ccaNumber || '').toLowerCase() === query
    );

    setCcaResult(found || 'not-found');
  };

  const currentListLabel = recordStatus === 'archived' ? 'archived customers' : 'active customers';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Customers</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Verified Descallar Satellite Services subscriber accounts
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('import'); setImportError(''); setImportPreview(null); setImportCredentials([]); }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Upload size={14} /> Import Excel
          </button>
          <button
            type="button"
            onClick={() => { setIssuedCredentials(null); openModal('add'); }}
            className="flex items-center gap-1.5 rounded-xl bg-[#cc0000] px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Plus size={14} /> Add Subscriber
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          label="Active Records"
          value={loading ? '...' : stats.total ?? 0}
          color="text-gray-800"
          icon={<Users size={15} className="text-gray-400" />}
        />
        <StatCard
          label="This Month"
          value={loading ? '...' : stats.thisMonth ?? 0}
          color="text-blue-600"
          icon={<Users size={15} className="text-blue-400" />}
        />
        <StatCard
          label="Active"
          value={loading ? '...' : stats.activeCount ?? 0}
          color="text-green-600"
          icon={<CheckCircle2 size={15} className="text-green-500" />}
        />
        <StatCard
          label="At Risk"
          value={loading ? '...' : stats.atRiskCount ?? 0}
          color="text-amber-600"
          icon={<AlertTriangle size={15} className="text-amber-500" />}
        />
        <StatCard
          label="Inactive"
          value={loading ? '...' : stats.inactiveCount ?? 0}
          color="text-gray-500"
          icon={<XCircle size={15} className="text-gray-400" />}
        />
        <StatCard
          label="Archived"
          value={loading ? '...' : stats.archivedCount ?? 0}
          color="text-red-600"
          icon={<Archive size={15} className="text-red-500" />}
        />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            <Search size={15} className="text-[#cc0000]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">CCA / Account Inquiry</h2>
            <p className="text-xs text-gray-400">
              Look up a subscriber by Account Number or CCA Number in the current list
            </p>
          </div>
        </div>

        <form onSubmit={handleCcaSearch} className="flex max-w-lg gap-2">
          <input
            type="text"
            value={ccaQ}
            onChange={(event) => {
              setCcaQ(event.target.value);
              if (!event.target.value) setCcaResult(null);
            }}
            placeholder="Account number or CCA number"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#cc0000]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#cc0000] px-5 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Search
          </button>
        </form>

        {ccaResult === 'not-found' && (
          <div className="mt-2.5 max-w-lg rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            ❌ No record found for &quot;{ccaQ}&quot; in {currentListLabel}.
          </div>
        )}

        {ccaResult && ccaResult !== 'not-found' && (() => {
          const status = getCustomerStatus(ccaResult);
          return (
            <div className="mt-2.5 max-w-lg rounded-xl border border-green-100 bg-green-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-green-700">✅ Record Found</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Account Name', value: ccaResult.accountName || '—' },
                  { label: 'Account No.', value: ccaResult.accountNumber || '—' },
                  { label: 'CCA No.', value: ccaResult.ccaNumber || '—' },
                  { label: 'Phone', value: ccaResult.phone || '—' },
                  { label: 'Location', value: normalizeLocation(ccaResult.location) },
                  { label: 'Registered', value: safeDate(ccaResult.created_at) },
                ].map((field) => (
                  <div key={field.label}>
                    <span className="text-gray-400" style={{ fontSize: '9px' }}>
                      {field.label}
                    </span>
                    <p className="text-xs font-medium text-gray-800">{field.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${actStyle[status].badge}`}
                >
                  {actStyle[status].icon} {status}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/admin/customers/' + ccaResult.id)}
                  className="flex items-center gap-1 text-xs text-[#cc0000] hover:underline"
                >
                  <ExternalLink size={11} /> View Full Profile
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex max-w-xs flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search name, account, CCA, phone, email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder-gray-400"
            />
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setRecordStatus('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                recordStatus === 'active' ? 'bg-[#cc0000] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active Records
            </button>
            <button
              type="button"
              onClick={() => setRecordStatus('archived')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                recordStatus === 'archived' ? 'bg-[#cc0000] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Archived ({stats.archivedCount ?? 0})
            </button>
          </div>

          <span className="ml-auto text-xs text-gray-400">
            Showing {displayedCustomers.length} of {customers.length}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {['All', ...LOCATIONS].map((location) => (
              <button
                key={location}
                type="button"
                onClick={() => setLocTab(location)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  locTab === location
                    ? 'bg-[#cc0000] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {location}
                {location !== 'All' && (
                  <span className={`ml-1 ${locTab === location ? 'text-red-200' : 'text-gray-400'}`}>
                    ({locationCounts[location] || 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {recordStatus !== 'archived' && (
            <div className="flex flex-wrap gap-1.5 border-l border-gray-100 pl-2">
              {ACTIVITY_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActivityTab(status)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activityTab === status
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  'Account Name',
                  'Account No.',
                  'CCA No.',
                  'Phone',
                  'Email',
                  'Location',
                  'Status',
                  'Registered',
                  'Actions',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500"
                    style={{ fontSize: '10px' }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-400">
                    No {recordStatus === 'archived' ? 'archived' : 'active'} customers found.
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);

                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-50 transition hover:bg-gray-50 last:border-0"
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800">
                        {customer.accountName || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">
                        {customer.accountNumber || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">
                        {customer.ccaNumber || '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{customer.phone || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="min-w-[150px]">
                          <p className="text-gray-600">{maskEmail(customer.email)}</p>
                          {customer.email_verified_at ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                              <CheckCircle2 size={9} /> Verified
                            </span>
                          ) : (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              <AlertTriangle size={9} /> Unverified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <MapPin size={10} className="text-gray-400" />
                          <span className="text-gray-500">{normalizeLocation(customer.location)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div className={`h-2 w-2 flex-shrink-0 rounded-full ${actStyle[status].dot}`} />
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${actStyle[status].badge}`}>
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{safeDate(customer.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <SmallActionButton
                            title="View customer profile"
                            icon={<ExternalLink size={12} />}
                            className="text-[#cc0000] hover:bg-red-50 hover:text-red-700"
                            onClick={() => navigate('/admin/customers/' + customer.id)}
                          >
                            View
                          </SmallActionButton>

                          {recordStatus !== 'archived' ? (
                            <>
                              <SmallActionButton
                                title="Edit customer"
                                icon={<Pencil size={12} />}
                                className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                onClick={() => openModal('edit', customer)}
                              >
                                Edit
                              </SmallActionButton>
                              <SmallActionButton
                                title="Generate temporary password"
                                icon={<KeyRound size={12} />}
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => handleResetCredentials(customer)}
                              >
                                Credentials
                              </SmallActionButton>
                              <SmallActionButton
                                title="Archive customer"
                                icon={<Archive size={12} />}
                                className="text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                                onClick={() => openModal('archive', customer)}
                              >
                                Archive
                              </SmallActionButton>
                            </>
                          ) : (
                            <SmallActionButton
                              title="Restore customer"
                              icon={<RotateCcw size={12} />}
                              className="text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => openModal('restore', customer)}
                            >
                              Restore
                            </SmallActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(mode === 'add' || mode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">
                {mode === 'add' ? 'Add New Customer' : `Edit — ${selected?.accountName}`}
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
                  { label: 'Subscriber Name *', name: 'accountName' },
                  { label: 'Account Number *', name: 'accountNumber' },
                  { label: 'CCA Number *', name: 'ccaNumber' },
                  { label: 'Phone (optional)', name: 'phone' },
                  { label: 'Email (optional)', name: 'email' },
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
                      inputMode={field.name === 'accountNumber' || field.name === 'ccaNumber' ? 'numeric' : undefined}
                      maxLength={field.name === 'accountNumber' ? 9 : field.name === 'ccaNumber' ? 11 : undefined}
                      disabled={mode === 'edit' && (field.name === 'accountNumber' || field.name === 'ccaNumber')}
                      onChange={(event) => {
                        if (field.name === 'accountNumber' || field.name === 'ccaNumber') {
                          event.target.value = event.target.value.replace(/\D/g, '');
                        }
                        handleChange(event);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000] disabled:bg-gray-100 disabled:text-gray-500"
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
                    onChange={handleChange}
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
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {mode === 'add' && issuedCredentials && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  <p className="font-bold">Temporary credentials — show or copy these now.</p>
                  <p className="mt-1">Account Number: <span className="font-mono font-bold">{issuedCredentials.accountNumber}</span></p>
                  <p>Temporary Password: <span className="font-mono font-bold">{issuedCredentials.temporaryPassword}</span></p>
                  <p>Recovery Code: <span className="font-mono font-bold">{issuedCredentials.recoveryCode}</span></p>
                  {issuedCredentials.temporaryPasswordExpiresAt && (
                    <p>Temporary Password Expires: <span className="font-semibold">{new Date(issuedCredentials.temporaryPasswordExpiresAt).toLocaleString()}</span></p>
                  )}
                  <p className="mt-1 text-green-700">The temporary password is valid for 7 days. The recovery code should be kept private for self-service password recovery.</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={mode === 'add' && issuedCredentials ? closeModal : saveCustomer}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#cc0000] py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : mode === 'add' && issuedCredentials ? 'Done' : mode === 'add' ? 'Create Subscriber' : 'Update Customer'}
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

      {mode === 'credentials' && issuedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-sm font-bold text-gray-900">Temporary Login Credentials</h2>
            <p className="mt-2 text-xs text-gray-500">Give these directly to the verified subscriber. The password will be changed on first login.</p>
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs">
              <p>Account Number: <span className="font-mono font-bold">{issuedCredentials.accountNumber}</span></p>
              <p className="mt-1">Temporary Password: <span className="font-mono font-bold">{issuedCredentials.temporaryPassword}</span></p>
              <p className="mt-1">Recovery Code: <span className="font-mono font-bold">{issuedCredentials.recoveryCode}</span></p>
              {issuedCredentials.temporaryPasswordExpiresAt && (
                <p className="mt-1">Expires: <span className="font-semibold">{new Date(issuedCredentials.temporaryPasswordExpiresAt).toLocaleString()}</span></p>
              )}
            </div>
            <button type="button" onClick={closeModal} className="mt-4 w-full rounded-xl bg-[#cc0000] py-2.5 text-xs font-semibold text-white">Done</button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Import Subscribers from Excel</h2>
                <p className="text-xs text-gray-500">Required columns: NAME, ADDRESS, CCA NUMBER, ACCT NUMBER</p>
              </div>
              <button type="button" onClick={closeModal}><X size={17} className="text-gray-400" /></button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto p-5">
              {importError && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{importError}</div>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Location for this file</label>
                  <select value={importLocation} onChange={(e) => { setImportLocation(e.target.value); setImportPreview(null); }} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs">
                    {LOCATIONS.map((location) => <option key={location}>{location}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Excel file (.xlsx)</label>
                  <input type="file" accept=".xlsx" onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportPreview(null); setImportCredentials([]); }} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs" />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button type="button" disabled={importBusy || !importFile} onClick={previewSubscriberImport} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {importBusy ? 'Checking...' : 'Preview & Validate'}
                </button>
                {importPreview?.summary?.valid > 0 && (
                  <button type="button" disabled={importBusy} onClick={confirmSubscriberImport} className="rounded-xl bg-[#cc0000] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Import {importPreview.summary.valid} Valid Subscriber{importPreview.summary.valid === 1 ? '' : 's'}
                  </button>
                )}
              </div>

              {importPreview && (
                <div className="mt-4">
                  <div className="mb-2 flex gap-3 text-xs">
                    <span className="font-semibold text-gray-700">Total: {importPreview.summary.total}</span>
                    <span className="font-semibold text-green-700">Valid: {importPreview.summary.valid}</span>
                    <span className="font-semibold text-red-700">Invalid/Duplicate: {importPreview.summary.invalid}</span>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-xl border">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-gray-50"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Account</th><th className="p-2 text-left">CCA</th><th className="p-2 text-left">Result</th></tr></thead>
                      <tbody>{importPreview.rows.map((row) => <tr key={row.rowNumber} className="border-t"><td className="p-2">{row.rowNumber}</td><td className="p-2">{row.accountName}</td><td className="p-2 font-mono">{row.accountNumber}</td><td className="p-2 font-mono">{row.ccaNumber}</td><td className={`p-2 ${row.valid ? 'text-green-700' : 'text-red-700'}`}>{row.valid ? 'Valid' : row.errors.join(' ')}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {importCredentials.length > 0 && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-xs font-bold text-green-800">Import complete: {importCredentials.length} credentials generated.</p><p className="text-[11px] text-green-700">Download them now. The system stores only password hashes.</p></div>
                    <button type="button" onClick={downloadCredentialsCsv} className="flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white"><Download size={13} /> Download Credentials</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'archive' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">Archive Customer</h2>
              <button type="button" onClick={closeModal} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100">
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
                Archive <span className="font-semibold">{selected.accountName}</span> ({selected.accountNumber})?
                This will hide the customer from active lists while preserving records.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-700 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Archiving...' : 'Archive'}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'restore' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">Restore Customer</h2>
              <button type="button" onClick={closeModal} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100">
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
                Restore <span className="font-semibold">{selected.accountName}</span> ({selected.accountNumber})?
                The customer will return to the active customer list.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? 'Restoring...' : 'Restore'}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50">
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
