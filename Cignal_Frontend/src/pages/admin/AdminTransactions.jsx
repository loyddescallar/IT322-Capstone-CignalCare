import { useEffect, useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import customerApi from '../../api/customerApi';
import { useNavigate } from 'react-router-dom';
import SalesDateFilter from '../../components/admin/SalesDateFilter';
import { dateBounds, manilaDayKey, isInManilaRange, isCompletedSale, transactionDate } from '../../utils/adminBusinessRules';
import { rowsToSafeCsv } from '../../utils/safeCsv';

const PAYMENT_METHODS = ['Cash', 'GCash', 'PayMongo'];
const PAGE_SIZE = 25;

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
  const [summary, setSummary] = useState({ transactions: 0, sales: 0, grossProfit: 0 });
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [payment, setPayment] = useState('All');
  const [period, setPeriod] = useState('This Month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { from, to } = useMemo(() => dateBounds(period, fromDate, toDate), [period, fromDate, toDate]);
  const invalidRange = period === 'Custom Range' && (!from || !to || from > to);
  const filters = useMemo(() => ({
    from, to, paymentMethod: payment, accountNumber: debouncedSearch,
  }), [from, to, payment, debouncedSearch]);

  useEffect(() => {
    let active = true;
    if (invalidRange) {
      setLoading(false);
      setTransactions([]);
      setSummary({ transactions: 0, sales: 0, grossProfit: 0 });
      setPagination({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
      setError('Select a valid start and end date for the custom range.');
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    axiosClient.get('/load/prepaid-transactions/paged', { params: { ...filters, page, pageSize: PAGE_SIZE } })
      .then(response => {
        if (!active) return;
        setTransactions(response.data?.transactions || []);
        setSummary(response.data?.summary || { transactions: 0, sales: 0, grossProfit: 0 });
        setPagination(response.data?.pagination || { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
      })
      .catch(requestError => {
        console.error('LOAD COMPLETED SALES ERROR:', requestError);
        if (!active) return;
        setTransactions([]);
        setSummary({ transactions: 0, sales: 0, grossProfit: 0 });
        setPagination({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
        setError('Unable to load completed sales. Check your connection and retry.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, invalidRange, refreshKey]);

  const navigateToSubscriber = async accountNumber => {
    if (!accountNumber) return;
    try {
      const response = await customerApi.getCustomerLookup(accountNumber);
      if (response.data?.user?.id) navigate('/admin/customers/' + response.data.user.id);
    } catch (lookupError) {
      console.error('SUBSCRIBER LOOKUP ERROR:', lookupError);
    }
  };

  // The paged screen never downloads the full history on initial page load.
  // Explicit export preserves the original behavior of exporting *all* matches.
  const handleExport = async () => {
    if (loading || invalidRange || exporting || error) return;
    setExporting(true);
    try {
      const response = await axiosClient.get('/load/prepaid-transactions', {
        params: { paymentMethod: payment, accountNumber: search.trim() },
      });
      const matched = (response.data?.transactions || []).filter(tx =>
        isCompletedSale(tx) && isInManilaRange(transactionDate(tx), from, to)
      );
      const headers = ['Reference Number', 'Subscriber Name', 'Account Number', 'Prepaid Plan', 'Sale Amount (PHP)', 'Gross Profit (PHP)', 'Payment Method', 'Processed By', 'Sale Date (Asia/Manila)', 'Expiry Date (Asia/Manila)', 'Status'];
      const rows = matched.map(tx => [tx.reference_no || '', tx.account_name || '', tx.account_number || '', tx.plan_name || '',
        Number(tx.amount || 0).toFixed(2), '40.00', tx.payment_method || '', tx.processed_by || '',
        formatDate(transactionDate(tx)), formatDate(tx.expiry_date), 'Completed']);
      const csv = rowsToSafeCsv([headers, ...rows]);
      const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cignalcare-completed-sales-${manilaDayKey(new Date())}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      console.error('EXPORT COMPLETED SALES ERROR:', exportError);
      setError('CSV export failed. Retry when the connection is available.');
    } finally {
      setExporting(false);
    }
  };

  return <div className="space-y-4">
    <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <div><h1 className="text-lg font-bold text-gray-800">Completed Sales</h1><p className="mt-0.5 text-xs text-gray-500">POS (Cash/GCash) and online PayMongo completed prepaid loads. Pending and failed requests stay in Load Requests.</p></div>
      <button type="button" disabled={loading || exporting || Boolean(error) || invalidRange} onClick={handleExport} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={15}/> {exporting ? 'Exporting…' : 'Export All Matching CSV'}</button>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><span>{error}</span><button type="button" className="font-semibold underline" onClick={() => setRefreshKey(v => v + 1)}>Retry</button></div>}
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SalesDateFilter period={period} setPeriod={v => { setPeriod(v); setPage(1); }} from={fromDate} setFrom={v => { setFromDate(v); setPage(1); }} to={toDate} setTo={v => { setToDate(v); setPage(1); }} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-col gap-1 text-xs text-gray-600">Payment Method
            <select value={payment} onChange={e => { setPayment(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"><option value="All">All Payments</option>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">Account Number
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"><Search size={14} className="text-gray-400"/><input type="search" value={search} maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search Account Number" className="w-full min-w-0 bg-transparent text-xs outline-none sm:w-48" /></div>
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3"><div><h2 className="text-sm font-bold text-gray-800">Completed Load Transactions</h2><p className="mt-1 text-xs text-gray-400">{pagination.total} sales matching the selected filters · Asia/Manila dates</p></div><p className="text-xs text-gray-500">Page {pagination.totalPages ? page : 0} of {pagination.totalPages}</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[990px] text-left text-xs">
        <thead className="bg-gray-50"><tr>{['Reference', 'Subscriber', 'Account No.', 'Plan', 'Amount', 'Gross Profit', 'Payment', 'Processed By', 'Sale Date', 'Status'].map(title => <th key={title} className="px-3 py-2.5 font-semibold text-gray-600">{title}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={10} className="py-10 text-center text-gray-400">Loading completed sales…</td></tr>
          : transactions.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-gray-400">{error ? 'Unable to display transactions.' : 'No completed sales match these filters.'}</td></tr>
          : transactions.map((tx, index) => <tr key={tx.id || index} className="border-t border-gray-100 hover:bg-gray-50">
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
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500">Up to {PAGE_SIZE} transactions per page</p>
        <div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= pagination.totalPages} onClick={() => setPage(v => v + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button></div>
      </div>
    </section>
  </div>;
}
