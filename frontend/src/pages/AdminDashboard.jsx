import Layout from "../components/Layout";

export default function AdminDashboard() {
  return (
    <Layout>
      <h1>Admin Dashboard</h1>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <div style={{ padding: "15px", border: "1px solid #ccc" }}>
          Total Users
        </div>

        <div style={{ padding: "15px", border: "1px solid #ccc" }}>
          Active Tickets
        </div>
      </div>
    </Layout>
  );

  return embedded ? content : content;
}

function MetricCard({ icon: Icon, title, value, caption, accent }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 ${accent}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>{title}</p>
          <p className="mt-3 text-5xl font-bold leading-none text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{caption}</p>
    </div>
  );
}

function ActionMetricCard({ onClick }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <MagnifyingGlassCircleIcon className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-slate-950">CCA Inquiry</p>
          <button
            onClick={onClick}
            className="mt-4 w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cignalRed hover:text-cignalRed"
          >
            Lookup CCA / Account Info
          </button>
        </div>
      </div>
    </div>
  );
}

function CardShell({ title, children }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function StatusOverview({ counts }) {
  const total = Math.max(Object.values(counts).reduce((sum, value) => sum + value, 0), 1);

  return (
    <div className="space-y-4">
      {Object.entries(counts).map(([label, value]) => (
        <div key={label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">{label}</span>
            <span className="text-slate-500">{value}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${STATUS_COLORS[label] || "bg-slate-400"}`}
              style={{ width: `${Math.max((value / total) * 100, value ? 8 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GrowthChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div>
      <div className="flex h-52 items-end gap-4 border-b border-l border-dashed border-slate-200 px-4 pb-4 pt-6">
        {data.map((point) => (
          <div key={point.key} className="flex flex-1 flex-col items-center gap-3">
            <div className="text-sm font-semibold text-slate-500">{point.value}</div>
            <div className="flex h-32 items-end">
              <div
                className="w-10 rounded-t-2xl bg-gradient-to-t from-blue-500 to-blue-300"
                style={{ height: `${Math.max((point.value / max) * 120, point.value ? 16 : 4)}px` }}
              />
            </div>
            <span className="text-sm text-slate-700">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightBlock({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-base leading-7 text-slate-900">{value}</p>
    </div>
  );
}

function DataTableCard({ title, columns, rows, emptyText, actionLabel, onAction }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-4 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-4 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={onAction}
        className="mt-5 rounded-2xl bg-cignalRed px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const className =
    status === "Resolved"
      ? "bg-green-100 text-green-700"
      : status === "In Progress"
      ? "bg-amber-100 text-amber-700"
      : status === "Closed"
      ? "bg-slate-200 text-slate-700"
      : "bg-red-100 text-red-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );

  const [stats, setStats] = useState({
  pending: 0,
  approved: 0,
  rejected: 0
});

useEffect(() => {
  axios.get("/load-requests").then((res) => {
    const data = res.data.history || res.data;

    setStats({
      pending: data.filter(x => x.status === "pending").length,
      approved: data.filter(x => x.status === "approved").length,
      rejected: data.filter(x => x.status === "rejected").length
    });
  });
}, []);

}
