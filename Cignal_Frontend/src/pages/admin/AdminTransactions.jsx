import { useState, useEffect, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import customerApi from '../../api/customerApi';
import { useNavigate } from 'react-router-dom';
import SalesDateFilter from '../../components/admin/SalesDateFilter';
import { dateBounds, manilaDayKey, isInManilaRange, isCompletedSale, salesSummary, transactionDate } from '../../utils/adminBusinessRules';

const PAYMENT_METHODS = ['Cash', 'GCash', 'PayMongo'];
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }) : '—';
}
const peso = amount => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function AdminTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('All');
  const [period, setPeriod] = useState('This Month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  useEffect(() => {
    let active = true;
    axiosClient.get('/load/prepaid-transactions')
      .then(response => { if (active) setTransactions(response.data?.transactions || []); })
      .catch(requestError => {
        console.error('LOAD COMPLETED SALES ERROR:', requestError);
        if (active) setError('Unable to load completed sales. Refresh and try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const { from, to } = dateBounds(period, fromDate, toDate);
  const filtered = useMemo(() => transactions.filter(tx =>
    isCompletedSale(tx) &&
    (payment === 'All' || tx.payment_method === payment) &&
    String(tx.account_number || '').toLowerCase().includes(search.trim().toLowerCase()) &&
    isInManilaRange(transactionDate(tx), from, to) &&
    !(period === 'Custom Range' && (!from || !to || from > to))
  ), [transactions, payment, search, period, from, to]);
  const summary = useMemo(() => salesSummary(filtered), [filtered]);
  const navigateToSubscriber = async accountNumber => {
    if (!accountNumber) return;
    try {
      const response = await customerApi.getCustomerLookup(accountNumber);
      if (response.data?.user?.id) navigate('/admin/customers/' + response.data.user.id);
    } catch (lookupError) { console.error('SUBSCRIBER LOOKUP ERROR:', lookupError); }
  };
  const handleExport = () => {
    const headers = ['Reference Number', 'Subscriber Name', 'Account Number', 'Prepaid Plan', 'Sale Amount (PHP)', 'Gross Profit (PHP)', 'Payment Method', 'Processed By', 'Sale Date (Asia/Manila)', 'Expiry Date (Asia/Manila)', 'Status'];
    const rows = filtered.map(tx => [tx.reference_no || '', tx.account_name || '', tx.account_number || '', tx.plan_name || '',
      Number(tx.amount || 0).toFixed(2), '40.00', tx.payment_method || '', tx.processed_by || '',
      formatDate(transactionDate(tx)), formatDate(tx.expiry_date), 'Completed']);
    const escapeCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `cignalcare-completed-sales-${manilaDayKey(new Date())}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-4">
    <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <div><h1 className="text-lg font-bold text-gray-800">Completed Sales</h1><p className="mt-0.5 text-xs text-gray-500">POS (Cash/GCash) and online PayMongo completed prepaid loads. Pending and failed requests stay in Load Requests.</p></div>
      <button type="button" disabled={loading || Boolean(error)} onClick={handleExport} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={15}/> Export CSV</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SalesDateFilter period={period} setPeriod={setPeriod} from={fromDate} setFrom={setFromDate} to={toDate} setTo={setToDate} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-col gap-1 text-xs text-gray-600">Payment Method
            <select value={payment} onChange={e => setPayment(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"><option value="All">All Payments</option>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">Account Number
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><Search size={14} className="text-gray-400"/><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Account Number" className="w-full min-w-0 bg-transparent text-xs outline-none sm:w-48" /></div>
          </label>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {[
        { label: 'Total Sales', value: peso(summary.sales), color: 'text-gray-900' },
        { label: 'Gross Profit (₱40 / load)', value: peso(summary.grossProfit), color: 'text-green-700' },
        { label: 'Completed Transactions', value: summary.transactions, color: 'text-blue-700' },
      ].map(item => <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><p className="mb-2 text-xs text-gray-500">{item.label}</p><p className={`text-2xl font-bold ${item.color}`}>{loading ? '...' : item.value}</p></div>)}
    </div>
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3"><h2 className="text-sm font-bold text-gray-800">Completed Load Transactions</h2><p className="mt-1 text-xs text-gray-400">{filtered.length} sales matching the selected filters · Asia/Manila dates</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[990px] text-left text-xs">
        <thead className="bg-gray-50"><tr>{['Reference', 'Subscriber', 'Account No.', 'Plan', 'Amount', 'Gross Profit', 'Payment', 'Processed By', 'Sale Date', 'Status'].map(title => <th key={title} className="px-3 py-2.5 font-semibold text-gray-600">{title}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={10} className="py-10 text-center text-gray-400">Loading completed sales…</td></tr>
          : filtered.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-gray-400">No completed sales match these filters.</td></tr>
          : filtered.map((tx, index) => <tr key={tx.id || index} className="border-t border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-mono text-gray-500">{tx.reference_no || '—'}</td>
            <td className="px-3 py-2"><button className="font-semibold text-gray-800 hover:text-red-700 hover:underline" onClick={() => navigateToSubscriber(tx.account_number)}>{tx.account_name || '—'}</button></td>
            <td className="px-3 py-2 font-mono">{tx.account_number || '—'}</td>
            <td className="px-3 py-2">{tx.plan_name || '—'}</td>
            <td className="px-3 py-2 font-bold text-red-700">{peso(tx.amount)}</td>
            <td className="px-3 py-2 font-semibold text-green-700">₱40.00</td>
            <td className="px-3 py-2">{tx.payment_method || '—'}</td>
            <td className="px-3 py-2">{tx.processed_by || '—'}</td>
            <td className="whitespace-nowrap px-3 py-2">{formatDate(transactionDate(tx))}</td>
            <td className="px-3 py-2"><span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-700">Completed</span></td>
          </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}
