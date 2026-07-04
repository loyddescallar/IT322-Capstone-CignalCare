import { useEffect, useMemo, useState } from "react";
import loadAdminApi from "../api/loadAdminApi";

export default function AdminTransactions({ embedded = false }) {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      setLoading(true);
      setError("");
      try {
        const res = await loadAdminApi.getAll();
        if (!active) return;
        setTransactions(res.data?.history || []);
      } catch (err) {
        console.error("LOAD TRANSACTIONS ERROR", err);
        if (active) setError(err?.response?.data?.error || "Failed to load transactions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransactions();
    return () => {
      active = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;

    return transactions.filter((transaction) =>
      [
        transaction.accountName,
        transaction.accountNumber,
        transaction.description,
        String(transaction.loadAmount),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [transactions, search]);

  const totalRevenue = filteredTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.loadAmount || 0),
    0
  );

  const content = (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Transactions" value={loading ? "..." : filteredTransactions.length} />
        <KpiCard label="Recorded Accounts" value={loading ? "..." : new Set(filteredTransactions.map((item) => item.accountNumber)).size} />
        <KpiCard label="Revenue" value={loading ? "..." : `PHP ${totalRevenue.toFixed(2)}`} />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            placeholder="Search customer, account, description, amount..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full max-w-lg rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cignalRed focus:ring-2 focus:ring-red-100"
          />
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Live data from load history
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Account No.</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Description</th>
                <th className="px-4 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading transactions...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No transactions found.</td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">{transaction.accountName || "Unknown Customer"}</td>
                    <td className="px-4 py-4">{transaction.accountNumber}</td>
                    <td className="px-4 py-4">PHP {Number(transaction.loadAmount || 0).toFixed(2)}</td>
                    <td className="px-4 py-4">{transaction.description || "POS prepaid load"}</td>
                    <td className="px-4 py-4 text-slate-500">{new Date(transaction.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  return embedded ? content : content;
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cignalRed">{label}</p>
      <p className="mt-3 text-4xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
