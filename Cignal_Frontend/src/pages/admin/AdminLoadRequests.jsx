import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Image, MapPin, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllLoadRequests, updateLoadStatus } from '../../api/loadRequestApi';
import customerApi from '../../api/customerApi';

const STATUSES = ['Received', 'Under Review', 'Attending', 'Completed', 'Rejected'];
const LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];

const STATUS_CONFIG = {
  Received: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  'Under Review': { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  Attending: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  Completed: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  Rejected: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const PAYMENT_BADGE = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  manual_review: 'bg-blue-100 text-blue-700',
};

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function paymentLabel(status) {
  if (!status || status === 'manual_review') return 'Manual Review';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminLoadRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoModal, setPhotoModal] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await getAllLoadRequests();
      setRequests(response.data?.requests || response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return requests
      .filter((request) => statusFilter === 'All' || request.status === statusFilter)
      .filter((request) => locationFilter === 'All' || request.location === locationFilter)
      .filter((request) => {
        const haystack = [
          request.account_name,
          request.account_number,
          request.reference_no,
          request.plan_name,
          request.payment_method,
          request.payment_status,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
  }, [requests, search, statusFilter, locationFilter]);

  const kpis = [
    { label: 'Total', value: requests.length, dot: 'bg-gray-400', color: 'text-gray-800' },
    { label: 'Pending Payment', value: requests.filter((request) => request.payment_status === 'pending').length, dot: 'bg-amber-400', color: 'text-amber-600' },
    { label: 'Ready to Process', value: requests.filter((request) => ['paid', 'manual_review'].includes(request.payment_status || 'manual_review') && !['Completed', 'Rejected'].includes(request.status)).length, dot: 'bg-blue-500', color: 'text-blue-600' },
    { label: 'Completed', value: requests.filter((request) => request.status === 'Completed').length, dot: 'bg-green-500', color: 'text-green-600' },
    { label: 'Rejected', value: requests.filter((request) => request.status === 'Rejected').length, dot: 'bg-red-500', color: 'text-red-600' },
  ];

  const openModal = (request) => {
    setSelected(request);
    setNewStatus(request.status);
    setAdminNote(request.admin_note || '');
    setSaveError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    try {
      await updateLoadStatus(selected.id, newStatus, adminNote);
      setRequests((prev) =>
        prev.map((request) =>
          request.id === selected.id
            ? {
                ...request,
                status: newStatus,
                admin_note: adminNote,
                fulfilled_at: newStatus === 'Completed' ? request.fulfilled_at || new Date().toISOString() : request.fulfilled_at,
              }
            : request
        )
      );
      setSelected(null);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to update request.');
    } finally {
      setSaving(false);
    }
  };

  const navigateToCustomer = async (accountNumber) => {
    try {
      const response = await customerApi.getCustomerLookup(accountNumber);
      if (response.data?.user?.id) navigate('/admin/customers/' + response.data.user.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-gray-800">Load Requests</h1>
        <p className="mt-0.5 text-xs text-gray-500">PayMongo and manual prepaid load requests submitted by subscribers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${stat.dot}`} />
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex max-w-xs flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search name, account, reference..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', ...LOCATIONS].map((location) => (
              <button
                key={location}
                onClick={() => setLocationFilter(location)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${locationFilter === location ? 'bg-[#cc0000] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {location}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', ...STATUSES].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${statusFilter === status ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-400">{filtered.length} requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['#', 'Account Name', 'Account No.', 'Plan', 'Amount', 'Method', 'Payment', 'Reference', 'Location', 'Process', 'Date', 'Photos', 'Actions'].map((header) => (
                  <th key={header} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500" style={{ fontSize: '10px' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="py-10 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} className="py-10 text-center text-gray-400">No load requests found.</td></tr>
              ) : (
                filtered.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.Received;
                  const paymentStatus = request.payment_status || 'manual_review';
                  return (
                    <tr key={request.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-400">{request.id}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => navigateToCustomer(request.account_number)} className="text-left font-semibold text-gray-800 hover:text-[#cc0000] hover:underline">
                          {request.account_name}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{request.account_number}</td>
                      <td className="px-3 py-2 text-gray-600">{request.plan_name}</td>
                      <td className="px-3 py-2 font-black text-[#cc0000]">₱{Number(request.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-500">{request.payment_method}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_BADGE[paymentStatus] || PAYMENT_BADGE.manual_review}`}>
                          {paymentLabel(paymentStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-400" style={{ fontSize: '10px' }}>{request.reference_no}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1"><MapPin size={10} className="text-gray-400" /><span className="text-gray-500">{request.location || '—'}</span></div>
                      </td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.badge}`}>{request.status}</span></td>
                      <td className="px-3 py-2 text-gray-400">{formatDate(request.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {request.receipt_photo && <button onClick={() => setPhotoModal({ url: request.receipt_photo, label: 'Receipt Photo' })} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"><Image size={10} />Receipt</button>}
                          {request.screen_photo && <button onClick={() => setPhotoModal({ url: request.screen_photo, label: 'TV Screen Photo' })} className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-100"><Image size={10} />Screen</button>}
                          {!request.receipt_photo && !request.screen_photo && <span className="text-xs text-gray-300">None</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2"><button onClick={() => openModal(request)} className="rounded-xl bg-[#cc0000] px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">Review</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPhotoModal(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-black text-gray-800">{photoModal.label}</h2>
              <button onClick={() => setPhotoModal(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-4"><img src={photoModal.url} alt={photoModal.label} className="max-h-96 w-full rounded-xl border border-gray-200 object-contain" /></div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-black text-gray-800">Review Load Request #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-3 p-5">
              {saveError && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <AlertTriangle size={15} />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Account Name', value: selected.account_name },
                  { label: 'Account No.', value: selected.account_number },
                  { label: 'Plan', value: selected.plan_name },
                  { label: 'Amount', value: '₱' + Number(selected.amount || 0).toLocaleString() },
                  { label: 'Method', value: selected.payment_method },
                  { label: 'Payment Status', value: paymentLabel(selected.payment_status || 'manual_review') },
                  { label: 'Reference No.', value: selected.reference_no },
                  { label: 'Diagnostic', value: selected.diagnostic_result || '—' },
                ].map((field) => (
                  <div key={field.label} className="rounded-xl bg-gray-50 p-3">
                    <p className="font-semibold text-gray-400" style={{ fontSize: '10px' }}>{field.label}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-gray-800">{field.value}</p>
                  </div>
                ))}
              </div>

              {selected.payment_method === 'PayMongo' && selected.payment_status !== 'paid' && newStatus === 'Completed' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  PayMongo payment is not confirmed yet. The backend will block completion until the webhook marks this request as paid.
                </div>
              )}

              {(selected.receipt_photo || selected.screen_photo) && (
                <div className="flex gap-3">
                  {selected.receipt_photo && (
                    <div>
                      <p className="mb-1 text-xs text-gray-400" style={{ fontSize: '10px' }}>RECEIPT</p>
                      <img src={selected.receipt_photo} alt="Receipt" onClick={() => setPhotoModal({ url: selected.receipt_photo, label: 'Receipt Photo' })} className="h-20 w-24 cursor-pointer rounded-xl border border-gray-200 object-cover hover:opacity-80" />
                    </div>
                  )}
                  {selected.screen_photo && (
                    <div>
                      <p className="mb-1 text-xs text-gray-400" style={{ fontSize: '10px' }}>TV SCREEN</p>
                      <img src={selected.screen_photo} alt="Screen" onClick={() => setPhotoModal({ url: selected.screen_photo, label: 'TV Screen Photo' })} className="h-20 w-24 cursor-pointer rounded-xl border border-gray-200 object-cover hover:opacity-80" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>Update Status</label>
                <select value={newStatus} onChange={(event) => setNewStatus(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]">
                  {STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>Admin Note</label>
                <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={2} placeholder="Optional note..." className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]" />
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#cc0000] py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? 'Saving...' : 'Update Request'}</button>
                <button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
