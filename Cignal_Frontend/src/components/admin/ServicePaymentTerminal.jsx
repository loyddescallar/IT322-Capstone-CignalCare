import { useEffect, useMemo, useRef, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const TYPES = [
  'Signal / Dish Repair', 'Dish Realignment', 'Cable Replacement',
  'Box Replacement', 'New Installation', 'Relocation', 'Other',
];
const peso = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const manilaToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const ATTEMPT_KEY = 'cignalcare_service_payment_pending_v1';
const createForm = () => ({ accountNumber: '', serviceType: TYPES[0], amount: '', paymentMethod: 'Cash',
  externalReference: '', transactionDate: manilaToday(), technicianRequestId: '', description: '' });

export default function ServicePaymentTerminal({ customers = [], onPaymentRecorded }) {
  const [form, setForm] = useState(createForm);
  const [requests, setRequests] = useState([]);
  const [recent, setRecent] = useState([]);
  const [summary, setSummary] = useState({ transactions: 0, revenue: 0 });
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const pendingRef = useRef(null);

  const customer = useMemo(() => customers.find(c => String(c.accountNumber) === form.accountNumber.trim()), [customers, form.accountNumber]);
  const update = (key, value) => { setForm(old => ({ ...old, [key]: value })); setError(''); setSuccess(''); };
  const loadHistory = async () => {
    const { data } = await axiosClient.get('/service-payments', { params: { page: 1, pageSize: 15 } });
    setRecent(data?.transactions || []);
    setSummary(data?.summary || { transactions: 0, revenue: 0 });
  };
  useEffect(() => {
    let alive = true;
    axiosClient.get('/service-payments', { params: { page: 1, pageSize: 15 } })
      .then(({ data }) => { if (!alive) return; setRecent(data.transactions || []); setSummary(data.summary || { transactions: 0, revenue: 0 }); })
      .catch(e => { if (alive) setError(e?.response?.status === 503
        ? 'FT-02 database migration is required before recording service payments.'
        : 'Unable to load service payment history.'); })
      .finally(() => { if (alive) setLoadingHistory(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    const number = form.accountNumber.trim();
    setRequests([]);
    if (!/^\d{1,9}$/.test(number)) return () => { alive = false; };
    setLoadingRequests(true);
    axiosClient.get('/service-payments/technician-requests', { params: { accountNumber: number } })
      .then(({ data }) => { if (alive) setRequests(data?.requests || []); })
      .catch(() => { if (alive) setRequests([]); })
      .finally(() => { if (alive) setLoadingRequests(false); });
    return () => { alive = false; };
  }, [form.accountNumber]);

  const formKey = JSON.stringify([form.accountNumber.trim(), form.serviceType, form.amount,
    form.paymentMethod, form.externalReference.trim(), form.transactionDate,
    form.technicianRequestId, form.description.trim()]);
  const validAmount = /^\d{1,7}(?:\.\d{1,2})?$/.test(form.amount) && Number(form.amount) >= 1 && Number(form.amount) <= 1000000;
  const canSubmit = /^\d{1,9}$/.test(form.accountNumber.trim()) && Boolean(form.serviceType) && validAmount &&
    Boolean(form.transactionDate) && form.transactionDate <= manilaToday() &&
    (form.paymentMethod === 'Cash' || Boolean(form.externalReference.trim())) &&
    (form.serviceType !== 'Other' || form.description.trim().length >= 5) &&
    paymentConfirmed && serviceCompleted && !processing;

  const save = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    let prior = pendingRef.current;
    try { prior ||= JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || 'null'); } catch { prior = null; }
    if (prior && prior.signature !== formKey) {
      setError('A previous payment has an uncertain result. Review Completed Sales before clearing its request ID.');
      return;
    }
    const attempt = prior || { signature: formKey, key: window.crypto.randomUUID() };
    pendingRef.current = attempt;
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    setProcessing(true); setError(''); setSuccess('');
    try {
      const { data } = await axiosClient.post('/service-payments', {
        ...form, accountNumber: form.accountNumber.trim(),
        technicianRequestId: form.technicianRequestId || null,
        description: form.description.trim(), externalReference: form.externalReference.trim(),
        paymentConfirmed: true, serviceCompleted: true,
      }, { headers: { 'Idempotency-Key': attempt.key } });
      sessionStorage.removeItem(ATTEMPT_KEY);
      pendingRef.current = null;
      setSuccess(`${data?.replayed ? 'Previously recorded payment confirmed' : 'Collected payment recorded'} · ${data?.referenceNo || ''}`);
      setForm(createForm()); setPaymentConfirmed(false); setServiceCompleted(false); setRequests([]);
      onPaymentRecorded?.();
      try { await loadHistory(); } catch { setError('Payment saved, but history refresh failed. Check Completed Sales.'); }
    } catch (e) {
      const status = e?.response?.status;
      if ([400, 403, 404, 409, 422].includes(status)) {
        sessionStorage.removeItem(ATTEMPT_KEY);
        pendingRef.current = null;
      }
      setError(!status || status >= 500
        ? 'Payment result uncertain. Check Completed Sales; retry only the SAME details with the same request ID.'
        : (e.response?.data?.error || 'Unable to save service payment.'));
    } finally { setProcessing(false); }
  };
  return (
    <section className="space-y-4 rounded-xl border border-red-100 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-bold text-gray-800">FT-02 · Record Collected Service Payment</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">Admin-only, manual recording for repairs and technician services. This does not charge GCash, update a technician request, or activate a prepaid plan.</p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        {error}
        {sessionStorage.getItem(ATTEMPT_KEY) && <button type="button" className="ml-2 font-bold underline" onClick={() => {
          if (window.confirm('Only clear after checking Completed Sales to ensure this payment was not recorded. Proceed?')) {
            sessionStorage.removeItem(ATTEMPT_KEY); pendingRef.current = null; setError('Pending request cleared. Confirm the payment was not previously recorded before submitting again.');
          }
        }}>Clear uncertain request</button>}
      </div>}
      {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-800">{success}</div>}
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-gray-700">Subscriber Account Number *
          <input required inputMode="numeric" maxLength={9} value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)} placeholder="e.g. 50000009" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          {customer && <span className="mt-1 block text-xs text-green-700">{customer.accountName}</span>}
        </label>
        <label className="text-xs font-semibold text-gray-700">Service Type *
          <select value={form.serviceType} onChange={e => update('serviceType', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-gray-700">Amount Collected (PHP) *
          <input required type="number" min="1" max="1000000" step="0.01" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="e.g. 350.00" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-gray-700">Transaction Date (Manila) *
          <input required type="date" max={manilaToday()} value={form.transactionDate} onChange={e => update('transactionDate', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-gray-700">Payment Method *
          <select value={form.paymentMethod} onChange={e => { update('paymentMethod', e.target.value); setForm(old => ({ ...old, paymentMethod: e.target.value, externalReference: '' })); }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option>Cash</option><option>GCash</option></select>
        </label>
        {form.paymentMethod === 'GCash' && <label className="text-xs font-semibold text-gray-700">Verified GCash Reference *
          <input required maxLength={120} value={form.externalReference} onChange={e => update('externalReference', e.target.value)} placeholder="Enter reference after confirming receipt" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>}
        <label className="text-xs font-semibold text-gray-700">Related Technician Request (optional)
          <select value={form.technicianRequestId} onChange={e => update('technicianRequestId', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">No linked request</option>
            {requests.map(r => <option key={r.id} value={r.id}>#{r.id} — {r.status} · {String(r.issueDescription || '').slice(0,55)}</option>)}
          </select>
          {loadingRequests && <span className="mt-1 block text-xs text-gray-500">Loading subscriber requests…</span>}
        </label>
        <label className="text-xs font-semibold text-gray-700 md:col-span-2">Service Details / Remarks {form.serviceType === 'Other' && '*'}
          <textarea rows={2} maxLength={500} required={form.serviceType === 'Other'} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Optional remarks or service description" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
        <div className="space-y-2 md:col-span-2">
          <label className="flex gap-2 text-xs text-gray-700"><input type="checkbox" checked={serviceCompleted} onChange={e => setServiceCompleted(e.target.checked)} /> I verify the service was actually completed.</label>
          <label className="flex gap-2 text-xs text-gray-700"><input type="checkbox" checked={paymentConfirmed} onChange={e => setPaymentConfirmed(e.target.checked)} /> I verify the stated amount was actually collected.</label>
          <button type="submit" disabled={!canSubmit} className="w-full rounded-lg bg-[#cc0000] px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{processing ? 'Recording…' : `Record Received Service Payment${validAmount ? ` · ${peso(form.amount)}` : ''}`}</button>
          <p className="text-xs text-gray-500">Revenue only. Service profit is not calculated. Repeated submissions reuse the same request ID until confirmed.</p>
        </div>
      </form>
      <div className="border-t border-gray-100 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-gray-700">Recent Recorded Service Sales</h3><p className="text-xs text-gray-500">{summary.transactions} completed service payments · {peso(summary.revenue)} collected</p></div><button type="button" onClick={() => loadHistory().catch(() => setError('Unable to refresh history.'))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold">Refresh</button></div>
        <div className="overflow-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-gray-50"><tr>{['Date', 'Subscriber', 'Service', 'Payment', 'Collected', 'Reference'].map(x => <th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>
          {loadingHistory ? <tr><td colSpan={6} className="p-4 text-gray-500">Loading service history…</td></tr> : recent.length ? recent.map(x => <tr key={x.id} className="border-t border-gray-100"><td className="px-3 py-2">{String(x.transaction_date || '').slice(0,10)}</td><td className="px-3 py-2">{x.account_name} · {x.account_number}</td><td className="px-3 py-2">{x.service_type}</td><td className="px-3 py-2">{x.payment_method}</td><td className="px-3 py-2 font-semibold">{peso(x.amount)}</td><td className="px-3 py-2 font-mono">{x.reference_no}</td></tr>) : <tr><td colSpan={6} className="p-4 text-center text-gray-500">No service payments recorded yet.</td></tr>}
        </tbody></table></div>
      </div>
    </section>
  );
}
