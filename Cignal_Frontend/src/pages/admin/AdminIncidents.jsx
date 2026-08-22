import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Siren,
  XCircle,
} from 'lucide-react';
import incidentApi from '../../api/incidentApi';

const STATUS_STYLE = {
  candidate: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-red-50 text-red-700 ring-red-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  dismissed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_LABEL = {
  candidate: 'Needs review',
  confirmed: 'Active',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = {
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    slate: 'border-slate-200 bg-white text-slate-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function IncidentCard({ incident, busy, onAction }) {
  const statusClass = STATUS_STYLE[incident.status] || STATUS_STYLE.dismissed;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusClass}`}>
              {STATUS_LABEL[incident.status] || incident.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={13} />
              {incident.location}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">{incident.issue_label}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {incident.distinct_subscribers} distinct subscribers · {incident.report_count} reports
          </p>
        </div>

        <div className="space-y-1 text-right text-[11px] text-slate-400">
          <p>First: {formatDateTime(incident.first_reported_at)}</p>
          <p>Latest: {formatDateTime(incident.last_reported_at)}</p>
        </div>
      </div>

      {incident.notes && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <span className="font-semibold text-slate-700">Admin note:</span> {incident.notes}
        </div>
      )}

      {incident.status === 'candidate' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={busy === incident.id}
            onClick={() => onAction(incident, 'confirm')}
            className="flex items-center gap-2 rounded-lg bg-[#cc0000] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#b40000] disabled:opacity-50"
          >
            <ShieldCheck size={14} />
            Confirm Incident
          </button>
          <button
            disabled={busy === incident.id}
            onClick={() => onAction(incident, 'dismiss')}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <XCircle size={14} />
            Dismiss
          </button>
        </div>
      )}

      {incident.status === 'confirmed' && (
        <button
          disabled={busy === incident.id}
          onClick={() => onAction(incident, 'resolve')}
          className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          Mark Resolved
        </button>
      )}
    </article>
  );
}

export default function AdminIncidents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await incidentApi.getAdminIncidents();
      setItems(response.data?.incidents || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(
    () => ({
      candidates: items.filter((item) => item.status === 'candidate'),
      active: items.filter((item) => item.status === 'confirmed'),
      history: items.filter((item) => ['resolved', 'dismissed'].includes(item.status)),
    }),
    [items]
  );

  const handleAction = async (incident, action) => {
    const notes = window.prompt('Optional Admin note:', '') ?? '';
    setBusy(incident.id);
    try {
      if (action === 'confirm') await incidentApi.confirm(incident.id, notes);
      if (action === 'dismiss') await incidentApi.dismiss(incident.id, notes);
      if (action === 'resolve') await incidentApi.resolve(incident.id, notes);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update incident.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Incidents & Common Issues</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            CignalCare+ flags patterns only when at least 3 distinct subscribers report the same specific issue in one location within 6 hours. Admin confirmation is always required.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Refresh Detection
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={AlertTriangle} label="Needs Review" value={groups.candidates.length} tone="amber" />
        <SummaryCard icon={Siren} label="Active Incidents" value={groups.active.length} tone="red" />
        <SummaryCard icon={Clock3} label="Incident History" value={groups.history.length} tone="slate" />
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Checking support patterns...
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-800">Possible Common Issues</h2>
            </div>
            {groups.candidates.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {groups.candidates.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} busy={busy} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                No current candidate meets the detection threshold.
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 mt-5 text-sm font-semibold text-slate-800">Confirmed Active Incidents</h2>
            {groups.active.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {groups.active.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} busy={busy} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                No active confirmed incidents.
              </div>
            )}
          </section>

          {groups.history.length > 0 && (
            <section>
              <h2 className="mb-3 mt-5 text-sm font-semibold text-slate-800">Incident History</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {groups.history.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} busy={busy} onAction={handleAction} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
