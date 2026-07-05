export default function AdminTopbar({
  title,
  subtitle,
  rightContent,
}) {
  const username = localStorage.getItem("username") || "Admin";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-sm font-semibold text-slate-900 capitalize">
            {username}
          </p>
        </div>
        {rightContent}
      </div>
    </div>
  );
}
