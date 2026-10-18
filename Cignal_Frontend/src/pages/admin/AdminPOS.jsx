import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, X } from 'lucide-react';
import customerApi from '../../api/customerApi';
import axiosClient from '../../api/axiosClient';

const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Bank Transfer'];
const E_WALLET_ACCOUNTS = {
  GCash: { name: 'Descallar Satellite Services', number: '09755718056' },
  Maya: { name: 'Descallar Satellite Services', number: '09755718056' },
};
const MANILA_TIME_ZONE = 'Asia/Manila';

function manilaDayKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: MANILA_TIME_ZONE });
}

export default function AdminPOS() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState('All');
  const [ccaQ, setCcaQ] = useState('');
  const [found, setFound] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [plan, setPlan] = useState(null);
  const [payMethod, setPayMethod] = useState('Cash');
  const [cashTendered, setCash] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [customerResponse, plansResponse, historyResponse] = await Promise.all([
          customerApi.getCustomers(),
          axiosClient.get('/load/plans'),
          axiosClient.get('/load/admin'),
        ]);
        if (!active) return;
        setCustomers(customerResponse.data?.customers || []);
        setPlans((plansResponse.data?.plans || []).filter((item) => item.status === 'active'));
        setHistory(historyResponse.data?.history || []);
      } catch (requestError) {
        console.error('LOAD POS DATA ERROR:', requestError);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const today = manilaDayKey(new Date());
  const todayLoads = useMemo(
    () => history.filter((item) => manilaDayKey(item.created_at) === today),
    [history, today]
  );
  const totalRevenue = useMemo(
    () => history.reduce((sum, item) => sum + Number(item.loadAmount || 0), 0),
    [history]
  );
  const displayedHistory = txFilter === 'Today' ? todayLoads : history;
  const eWalletAccount = E_WALLET_ACCOUNTS[payMethod] || null;
  const isNonCash = payMethod !== 'Cash';
  const change = cashTendered && plan
    ? Math.max(0, Number(cashTendered) - Number(plan.amount))
    : 0;

  const handleSearch = (event) => {
    event.preventDefault();
    const query = ccaQ.trim();
    if (!query) return;

    const subscriber = customers.find(
      (item) => item.accountNumber === query || item.ccaNumber === query
    );
    setFound(subscriber || null);
    setNotFound(!subscriber);
    setPlan(null);
    setPaymentReference('');
    setSuccess(null);
    setError('');
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setError('Unable to copy automatically. Please copy the value manually.');
    }
  };

  const handleProcess = async () => {
    if (!found || !plan || processing) return;

    if (
      payMethod === 'Cash' &&
      (!cashTendered || Number(cashTendered) < Number(plan.amount))
    ) {
      setError('Enter a cash amount equal to or greater than the selected plan.');
      return;
    }

    if (isNonCash && !paymentReference.trim()) {
      setError(`Enter the ${payMethod} payment/reference number after confirming that payment was received.`);
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess(null);

    try {
      const referenceNote = isNonCash
        ? ` · External payment ref ${paymentReference.trim()}`
        : '';

      await axiosClient.post('/load', {
        accountNumber: found.accountNumber,
        planId: plan.id,
        loadAmount: plan.amount,
        paymentMethod: payMethod,
        description: `POS Load — ${plan.plan_name} via ${payMethod}${referenceNote}`,
      });

      setSuccess({
        subscriber: found.accountName,
        plan: plan.plan_name,
        amount: plan.amount,
      });
      setFound(null);
      setPlan(null);
      setCcaQ('');
      setNotFound(false);
      setCash('');
      setPaymentReference('');

      const historyResponse = await axiosClient.get('/load/admin');
      setHistory(historyResponse.data?.history || []);
    } catch (requestError) {
      console.error('PROCESS POS LOAD ERROR:', requestError);
      setError(requestError.response?.data?.error || 'Unable to process this load transaction.');
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = Boolean(found && plan) && !processing && (
    payMethod === 'Cash'
      ? Boolean(cashTendered) && Number(cashTendered) >= Number(plan.amount)
      : Boolean(paymentReference.trim())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">POS / Prepaid</h1>
        <p className="mt-0.5 text-xs text-gray-500">Process verified prepaid load transactions for subscribers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Loads Today', value: loading ? '...' : todayLoads.length, color: 'text-blue-600' },
          { label: 'Total Transactions', value: loading ? '...' : history.length, color: 'text-gray-800' },
          { label: 'Total Revenue', value: loading ? '...' : `₱${totalRevenue.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Available Plans', value: loading ? '...' : plans.length, color: 'text-[#cc0000]' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Load Terminal</h2>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <X size={14} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-xs font-semibold leading-5 text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="text-xs font-semibold text-green-700">Load recorded successfully.</p>
                <p className="mt-0.5 text-xs text-green-600">
                  {success.subscriber} — {success.plan} (₱{Number(success.amount).toLocaleString()})
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Step 1 — Find Subscriber</p>
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={ccaQ}
                onChange={(event) => {
                  setCcaQ(event.target.value);
                  setNotFound(false);
                  setFound(null);
                }}
                placeholder="Account No. or CCA No."
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#cc0000]"
              />
              <button type="submit" className="w-full rounded-xl bg-[#cc0000] px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 sm:w-auto">Search</button>
            </form>
            {notFound && <p className="mt-1.5 text-xs text-red-600">No subscriber found for “{ccaQ}”.</p>}
            {found && (
              <div className="mt-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2">
                <p className="text-xs font-semibold text-green-700">✓ {found.accountName}</p>
                <p className="font-mono text-xs text-green-600">{found.accountNumber} · {found.location}</p>
              </div>
            )}
          </div>

          {found && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Step 2 — Select Plan</p>
              <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto">
                {plans.length === 0 ? (
                  <p className="col-span-2 py-4 text-center text-xs text-gray-400">No active plans.</p>
                ) : plans.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPlan(item);
                      setError('');
                      setSuccess(null);
                    }}
                    className={`rounded-xl border p-2.5 text-left transition-colors ${plan?.id === item.id ? 'border-[#cc0000] bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                  >
                    <p className="text-xs font-bold text-gray-800">{item.plan_name}</p>
                    <p className="text-xs font-semibold text-[#cc0000]">₱{Number(item.amount).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{item.validity_days} days · {item.hd_channels}HD/{item.sd_channels}SD</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {found && plan && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Step 3 — Payment Method</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPayMethod(method);
                      setCash('');
                      setPaymentReference('');
                      setError('');
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${payMethod === method ? 'border-[#cc0000] bg-[#cc0000] text-white' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {payMethod === 'Cash' ? (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Amount Tendered</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashTendered}
                    onChange={(event) => setCash(event.target.value)}
                    placeholder={`₱${Number(plan.amount).toLocaleString()}`}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#cc0000]"
                  />
                  {cashTendered && Number(cashTendered) >= Number(plan.amount) && <p className="mt-1 text-xs font-semibold text-green-600">Change: ₱{change.toLocaleString()}</p>}
                  {cashTendered && Number(cashTendered) < Number(plan.amount) && <p className="mt-1 text-xs text-red-600">Short by ₱{(Number(plan.amount) - Number(cashTendered)).toLocaleString()}</p>}
                </div>
              ) : (
                <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {eWalletAccount && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Merchant account details</p>
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-xs text-slate-500">{eWalletAccount.name}</p>
                          <p className="font-mono text-sm font-bold text-slate-800">{eWalletAccount.number}</p>
                        </div>
                        <button type="button" onClick={() => copyText(eWalletAccount.number, 'number')} className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                          {copied === 'number' ? <Check size={12} /> : <Copy size={12} />}
                          {copied === 'number' ? 'Copied' : 'Copy Number'}
                        </button>
                      </div>
                    </div>
                  )}

                  {payMethod === 'Bank Transfer' && (
                    <p className="text-xs leading-5 text-amber-700">Use only the business bank details authorized by Descallar Satellite Services. Confirm the incoming transfer in the merchant/bank account before processing the load.</p>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Payment / Reference Number *</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder={`Enter the verified ${payMethod} reference`}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#cc0000]"
                    />
                  </div>
                  <p className="text-xs leading-5 text-slate-500">This POS screen does not validate external wallet/bank payments automatically. Process the load only after staff verifies that payment was actually received.</p>
                </div>
              )}
            </div>
          )}

          {found && plan && (
            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              {[
                { label: 'Subscriber', value: found.accountName },
                { label: 'Plan', value: plan.plan_name },
                { label: 'Amount', value: `₱${Number(plan.amount).toLocaleString()}` },
                { label: 'Payment', value: payMethod },
              ].map((field) => (
                <div key={field.label} className="flex justify-between gap-3 text-xs">
                  <span className="text-gray-500">{field.label}</span>
                  <span className={`text-right font-semibold ${field.label === 'Amount' ? 'text-[#cc0000]' : 'text-gray-800'}`}>{field.value}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={handleProcess}
                disabled={!canProcess}
                className="mt-2 w-full rounded-xl bg-[#cc0000] py-3 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? 'Processing...' : isNonCash ? `Confirm Payment Received & Process ₱${Number(plan.amount).toLocaleString()} Load` : `Process ₱${Number(plan.amount).toLocaleString()} Load`}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
            <div className="flex gap-1">
              {['Today', 'All'].map((filter) => (
                <button key={filter} type="button" onClick={() => setTxFilter(filter)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${txFilter === filter ? 'bg-[#cc0000] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{filter}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[460px] divide-y divide-gray-50 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading...</div>
            ) : displayedHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No transactions.</div>
            ) : displayedHistory.slice(0, 25).map((item, index) => (
              <div key={item.id || index} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{item.accountNumber}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{item.description || 'Prepaid Load'}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('en-PH', { timeZone: MANILA_TIME_ZONE })}</p>
                </div>
                <p className="text-sm font-bold text-[#cc0000]">₱{Number(item.loadAmount || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
