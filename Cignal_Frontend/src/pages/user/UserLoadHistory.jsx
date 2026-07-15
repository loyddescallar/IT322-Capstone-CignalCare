import { useEffect, useMemo, useState } from 'react';
import { History, Image, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserPageShell from '../../components/UserPageShell';
import RequestTimeline from '../../components/RequestTimeline';
import { getMyLoadRequests } from '../../api/loadRequestApi';

const STATUS_BADGE = {
  Received: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Attending: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
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

function labelPaymentStatus(status) {
  if (status === 'manual_review') return 'Manual Review';
  if (!status) return 'Manual Review';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const LOAD_STEPS = ['Received', 'Under Review', 'Attending', 'Completed'];

export default function UserLoadHistory() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    getMyLoadRequests()
      .then((response) => setRequests(response.data?.requests || response.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return requests.filter((request) => {
      const haystack = [
        request.plan_name,
        request.reference_no,
        request.status,
        request.payment_status,
        request.payment_method,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [requests, search]);

  const total = requests.length;
  const pending = requests.filter((request) => !['Completed', 'Rejected'].includes(request.status)).length;
  const paid = requests.filter((request) => request.payment_status === 'paid' || request.payment_status === 'manual_review').length;
  const completed = requests.filter((request) => request.status === 'Completed').length;

  return (
    <UserPageShell
      title="My Load Requests"
      description="Track payment confirmation, manual proof review, and load processing progress."
      icon={History}
      actions={(
        <button onClick={() => navigate('/user/load-request')} className="inline-flex items-center gap-2 rounded-xl bg-[#cc0000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"><Plus size={15} /> New Load Request</button>
      )}
      contentClassName="space-y-5"
    >

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total Requests', value: total, color: 'text-gray-800' },
            { label: 'Pending Process', value: pending, color: 'text-amber-600' },
            { label: 'Paid / Proof Sent', value: paid, color: 'text-blue-600' },
            { label: 'Completed', value: completed, color: 'text-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{loading ? '...' : stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:max-w-md">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search plan, reference, status..."
            className="w-full bg-transparent text-xs text-gray-600 outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Plan', 'Amount', 'Method', 'Payment', 'Reference', 'Submitted', 'Process', 'Photos'].map((header) => (
                    <th key={header} className="px-4 py-2.5 text-left font-semibold uppercase text-gray-500" style={{ fontSize: '10px' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">No load requests found.</td>
                  </tr>
                ) : (
                  filtered.map((request) => (
                    <tr key={request.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{request.plan_name}</td>
                      <td className="px-4 py-3 font-black text-[#cc0000]">₱{Number(request.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{request.payment_method}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_BADGE[request.payment_status] || PAYMENT_BADGE.manual_review}`}>
                          {labelPaymentStatus(request.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400" style={{ fontSize: '10px' }}>{request.reference_no}</td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(request.created_at)}</td>
                      <td className="min-w-[230px] px-4 py-3">
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[request.status] || 'bg-gray-100 text-gray-600'}`}>
                            {request.status}
                          </span>
                          <RequestTimeline steps={LOAD_STEPS} current={request.status === 'Rejected' ? 'Received' : request.status} failed={request.status === 'Rejected'} compact />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {request.receipt_photo && (
                            <button onClick={() => setPhoto({ url: request.receipt_photo, label: 'Receipt' })} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600">
                              <Image size={10} /> Receipt
                            </button>
                          )}
                          {request.screen_photo && (
                            <button onClick={() => setPhoto({ url: request.screen_photo, label: 'TV Screen' })} className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-xs text-purple-600">
                              <Image size={10} /> Screen
                            </button>
                          )}
                          {!request.receipt_photo && !request.screen_photo && <span className="text-xs text-gray-300">None</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {photo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPhoto(null)}>
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <h2 className="text-sm font-black text-gray-800">{photo.label}</h2>
                <button onClick={() => setPhoto(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4">
                <img src={photo.url} alt={photo.label} className="max-h-96 w-full rounded-xl border border-gray-200 object-contain" />
              </div>
            </div>
          </div>
        )}
    </UserPageShell>
  );
}
