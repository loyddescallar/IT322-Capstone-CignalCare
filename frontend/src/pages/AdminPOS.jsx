import { useEffect, useMemo, useState } from "react";
import customerApi from "../api/customerApi";
import loadAdminApi from "../api/loadAdminApi";

const EMPTY_FORM = {
  loadAmount: "",
  description: "",
};

export default function AdminPOS({ embedded = false }) {
  const [searchAccount, setSearchAccount] = useState("");
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await loadAdminApi.getAll();
      setHistory(res.data?.history || []);
    } catch (err) {
      console.error("LOAD HISTORY ERROR", err);
      setError(err?.response?.data?.error || "Failed to load POS data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const kpis = useMemo(() => {
    const totalTransactions = history.length;
    const totalRevenue = history.reduce((sum, item) => sum + Number(item?.loadAmount || 0), 0);
    const todayKey = new Date().toDateString();
    const todayLoads = history.filter((item) => new Date(item.created_at).toDateString() === todayKey).length;
    const activeAccounts = new Set(history.map((item) => item.accountNumber)).size;

    return { totalTransactions, totalRevenue, todayLoads, activeAccounts };
  }, [history]);

  const handleSearchCustomer = async () => {
    setSearching(true);
    setError("");
    setCustomer(null);

    if (!searchAccount.trim()) {
      setError("Enter an account number or CCA number first.");
      setSearching(false);
      return;
    }

    try {
      const res = await customerApi.getCustomerLookup(searchAccount.trim());
      setCustomer(res.data?.user || null);
    } catch (err) {
      console.error("CUSTOMER LOOKUP ERROR", err);
      setError(err?.response?.data?.error || "Customer not found.");
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProcessLoad = async (event) => {
    event.preventDefault();
    setError("");

    if (!customer?.accountNumber) {
      setError("Search and select a valid customer before processing load.");
      return;
    }

    if (!form.loadAmount) {
      setError("Load amount is required.");
      return;
    }

    setSubmitting(true);
    try {
      await loadAdminApi.create({
        accountNumber: customer.accountNumber,
        loadAmount: form.loadAmount,
        description: form.description || "POS prepaid load",
      });
      setForm(EMPTY_FORM);
      await loadHistory();
      alert("Load transaction recorded successfully.");
    } catch (err) {
      console.error("PROCESS LOAD ERROR", err);
      setError(err?.response?.data?.error || "Failed to record load transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Loads Today" value={loading ? "..." : kpis.todayLoads} />
        <KpiCard label="Transactions" value={loading ? "..." : kpis.totalTransactions} />
        <KpiCard label="Revenue" value={loading ? "..." : `PHP ${kpis.totalRevenue.toFixed(2)}`} />
        <KpiCard label="Active Accounts" value={loading ? "..." : kpis.activeAccounts} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Customer Search</h2>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={searchAccount}
                onChange={(event) => setSearchAccount(event.target.value)}
                placeholder="Enter account number or CCA number"
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cignalRed focus:ring-2 focus:ring-red-100"
              />
              <button
                onClick={handleSearchCustomer}
                className="rounded-2xl bg-cignalRed px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Customer Information</h2>
            {!customer ? (
              <p className="mt-4 text-sm text-slate-500">Search a customer first to continue POS loading.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Info label="Customer Name" value={customer.accountName} />
                <Info label="Account Number" value={customer.accountNumber} />
                <Info label="CCA Number" value={customer.ccaNumber} />
                <Info label="Phone" value={customer.phone || "—"} />
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Process Load</h2>
            <form onSubmit={handleProcessLoad} className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Load Amount"
                name="loadAmount"
                type="number"
                value={form.loadAmount}
                onChange={handleChange}
              />
              <Field
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
              />
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-cignalRed px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Processing..." : "Record Load Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Recent Transactions</h2>
          <div className="mt-4 space-y-3">
            {history.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-[22px] border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.accountName || "Unknown Customer"}</p>
                <p className="mt-1 text-xs text-slate-500">{item.accountNumber}</p>
                <p className="mt-3 text-sm text-slate-800">Load: PHP {Number(item.loadAmount || 0).toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.description || "POS prepaid load"} • {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {!loading && history.length === 0 && (
              <p className="text-sm text-slate-400">No load transactions recorded yet.</p>
            )}
          </div>
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

function Info({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cignalRed focus:ring-2 focus:ring-red-100"
      />
    </label>
  );
}
