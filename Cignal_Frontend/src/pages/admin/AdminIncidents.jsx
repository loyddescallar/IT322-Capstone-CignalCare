
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  RefreshCw,
  Siren,
  X,
} from 'lucide-react';
import incidentApi from '../../api/incidentApi';
import useVisibleRefresh from '../../hooks/useVisibleRefresh';

const PAGE_SIZE = 40;

const COLUMNS = [
  {
    key: 'candidate',
    title: 'Needs Review',
    Icon: Clock3,
    color: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'confirmed',
    title: 'Confirmed',
    Icon: Siren,
    color: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  {
    key: 'resolved',
    title: 'Resolved',
    Icon: CheckCircle2,
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
  },
];

const emptyPage = () => ({
  items: [],
  total: 0,
  hasMore: false,
});

const initialBoard = () => ({
  candidate: emptyPage(),
  confirmed: emptyPage(),
  resolved: emptyPage(),
});

const pageFrom = (data) => ({
  items: data?.incidents || [],
  total: Number(data?.total || 0),
  hasMore: Boolean(data?.hasMore),
});

const formatDate = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return '—';
  }

  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function Dialog({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  onDetails,
  onAction,
  busy,
  historical = false,
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900">
          {incident.issue_label}
        </h3>

        {historical && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
            Dismissed
          </span>
        )}
      </div>

      <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">
        <MapPin size={13} />
        {incident.location}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {incident.report_count} reports · {incident.distinct_subscribers} subscribers
      </p>

      {historical && incident.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-600">
          Reason: {incident.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {incident.status === 'candidate' && !historical && (
          <>
            <button
              disabled={Boolean(busy)}
              onClick={() => onAction(incident, 'confirm')}
              className="min-h-9 rounded-lg bg-[#cc0000] px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Confirm
            </button>

            <button
              disabled={Boolean(busy)}
              onClick={() => onAction(incident, 'dismiss')}
              className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Dismiss
            </button>
          </>
        )}

        {incident.status === 'confirmed' && !historical && (
          <button
            disabled={Boolean(busy)}
            onClick={() => onAction(incident, 'resolve')}
            className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            Mark Resolved
          </button>
        )}

        <button
          onClick={() => onDetails(incident)}
          className="ml-auto flex min-h-9 items-center gap-1 px-2 text-xs font-semibold text-slate-600"
        >
          <Eye size={14} />
          Details
        </button>
      </div>
    </article>
  );
}

export default function AdminIncidents() {
  const [board, setBoard] = useState(initialBoard);
  const [locations, setLocations] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [location, setLocation] = useState('');
  const [activeLane, setActiveLane] = useState('all');
  const [dismissedCount, setDismissedCount] = useState(null);
  const [sort, setSort] = useState('newest');
  const [mobile, setMobile] = useState('candidate');
  const [revision, setRevision] = useState(0);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(emptyPage);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMoreLoading, setHistoryMoreLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [details, setDetails] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const currentBoard = useRef(0);
  const currentHistory = useRef(0);
  const lanePageSizes=useRef({candidate:PAGE_SIZE,confirmed:PAGE_SIZE,resolved:PAGE_SIZE,dismissed:PAGE_SIZE});
  // Read-only refresh: do not trigger detection, close dialogs, or reset filters.
  useVisibleRefresh(() => {
    if (!loading && !busy && !moreLoading && !decision && !details) {
      setRevision((previous) => previous + 1);
    }
  }, 30000);

  const dismissDecision = useCallback(() => {
    if (!busy) {
      setDecision(null);
    }
  }, [busy]);

  useEffect(() => {
    const version = ++currentBoard.current;
    let cancelled = false;

    setLoading(true);
    setError('');

    Promise.all(
      COLUMNS.map(({ key }) =>
        incidentApi.getAdminIncidents({
          status: key,
          location,
          sort,
          offset: 0,
          limit: Math.min(100, Math.max(PAGE_SIZE,lanePageSizes.current[key] || PAGE_SIZE)),
          ...(key === 'candidate'
            ? { includeLocations: '1' }
            : {}),
        })
      )
    )
      .then((results) => {
        if (cancelled || version !== currentBoard.current) {
          return;
        }

        const next = {};

        COLUMNS.forEach(({ key }, index) => {
          next[key] = pageFrom(results[index].data);
        });

        setBoard(next);
        setLocations(results[0].data?.locations || []);
        setPolicy(results[0].data?.detectionPolicy || null);
      })
      .catch((err) => {
        if (!cancelled && version === currentBoard.current) {
          setError(
            err.response?.data?.error ||
              'Unable to load incidents.'
          );
        }
      })
      .finally(() => {
        if (!cancelled && version === currentBoard.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, sort, revision]);

  useEffect(() => {
    if (!historyOpen) {
      return;
    }

    const version = ++currentHistory.current;
    let cancelled = false;

    setHistoryLoading(true);
    setHistoryError('');

    incidentApi
      .getAdminIncidents({
        status: 'dismissed',
        location,
        sort,
        limit: PAGE_SIZE,
        offset: 0,
      })
      .then((result) => {
        if (!cancelled && version === currentHistory.current) {
          setHistory(pageFrom(result.data));
        }
      })
      .catch((err) => {
        if (!cancelled && version === currentHistory.current) {
          setHistoryError(
            err.response?.data?.error ||
              'Unable to load dismissed history.'
          );
        }
      })
      .finally(() => {
        if (!cancelled && version === currentHistory.current) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [historyOpen, location, sort, revision]);

  // Summary is fetched independently of the dismissed-history modal.
  useEffect(() => {
    let active = true;
    incidentApi.getAdminIncidents({ status: 'dismissed', location, sort, limit: 1, offset: 0 })
      .then(({ data }) => { if (active) setDismissedCount(Number(data?.total || 0)); })
      .catch(() => { if (active) setDismissedCount(null); });
    return () => { active = false; };
  }, [location, sort, revision]);

  const loadMore = async (status) => {
    const lane = board[status];

    if (loading || moreLoading || !lane?.hasMore) {
      return;
    }

    const version = currentBoard.current;
    setMoreLoading(status);

    try {
      const response = await incidentApi.getAdminIncidents({
        status,
        location,
        sort,
        limit: PAGE_SIZE,
        offset: lane.items.length,
      });

      if (version !== currentBoard.current) {
        return;
      }

      lanePageSizes.current[status]=Math.min(100,lane.items.length+(response.data?.incidents||[]).length);
      setBoard((previous) => ({
        ...previous,
        [status]: {
          items: [
            ...previous[status].items,
            ...(response.data?.incidents || []),
          ],
          total: Number(response.data?.total || 0),
          hasMore: Boolean(response.data?.hasMore),
        },
      }));
    } catch (err) {
      if (version === currentBoard.current) {
        setError(
          err.response?.data?.error ||
            'Unable to load more incidents.'
        );
      }
    } finally {
      setMoreLoading('');
    }
  };

  const loadMoreHistory = async () => {
    if (
      historyLoading ||
      historyMoreLoading ||
      !history.hasMore
    ) {
      return;
    }

    const version = currentHistory.current;
    setHistoryMoreLoading(true);

    try {
      const response = await incidentApi.getAdminIncidents({
        status: 'dismissed',
        location,
        sort,
        limit: PAGE_SIZE,
        offset: history.items.length,
      });

      if (version !== currentHistory.current) {
        return;
      }

      setHistory((previous) => ({
        items: [
          ...previous.items,
          ...(response.data?.incidents || []),
        ],
        total: Number(response.data?.total || 0),
        hasMore: Boolean(response.data?.hasMore),
      }));
    } catch (err) {
      if (version === currentHistory.current) {
        setHistoryError(
          err.response?.data?.error ||
            'Unable to load more history.'
        );
      }
    } finally {
      setHistoryMoreLoading(false);
    }
  };

  // Kept as runDetection to match the existing regression test.
  const runDetection = async () => {
    if (busy) {
      return;
    }

    setBusy('detect');
    setError('');

    try {
      await incidentApi.detectCandidates();
      setRevision((value) => value + 1);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to refresh detection.'
      );
    } finally {
      setBusy('');
    }
  };

  const startDecision = (incident, action) => {
    if (busy) {
      return;
    }

    setDecision({ incident, action });
    setReason('');
    setNotes('');
  };

  const commitDecision = async () => {
    if (!decision || busy) {
      return;
    }

    const { incident, action } = decision;

    const adminNote =
      action === 'dismiss'
        ? reason === 'Other'
          ? notes.trim()
          : reason + (notes.trim() ? ': ' + notes.trim() : '')
        : notes.trim();

    if (action === 'dismiss' && !adminNote) {
      return;
    }

    setBusy(incident.id);
    setError('');

    try {
      if (action === 'confirm') {
        await incidentApi.confirm(incident.id, adminNote);
      } else if (action === 'dismiss') {
        await incidentApi.dismiss(incident.id, adminNote);
      } else if (action === 'resolve') {
        await incidentApi.resolve(incident.id, adminNote);
      }

      setDecision(null);
      setRevision((value) => value + 1);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to update incident.'
      );

      if (err.response?.status === 409) {
        setDecision(null);
        setRevision((value) => value + 1);
      }
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Incidents & Outages
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Review, confirm, and resolve common service issues.
          </p>
        </div>

        <button
          onClick={runDetection}
          disabled={Boolean(busy) || loading}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={busy === 'detect' ? 'animate-spin' : ''}
          />
          Refresh Detection
        </button>
      </div>

      {/* ERRORS */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">
            Filter location
          </span>

          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">
              All Locations
            </option>

            {locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">
            Sort incidents
          </span>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="newest">
              Newest
            </option>

            <option value="oldest">
              Oldest
            </option>
          </select>
        </label>

      </div>

      {/* DETECTION POLICY */}
      {policy && (
        <p className="text-[11px] text-slate-400">
          Detection: {policy.minDistinctSubscribers} subscribers ·
          same issue and location · within {policy.windowHours} hours.
          Admin confirmation required.
        </p>
      )}

      {/* KPI STATUS NAVIGATION */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map(({ key, title, Icon, color }) => (
          <button key={key} type="button" aria-pressed={activeLane === key}
            onClick={() => { setActiveLane(prev => prev === key ? 'all' : key); setMobile(key); }}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${activeLane===key?'border-red-600 ring-2 ring-red-100':'border-slate-200'}`}>
            <div className={`flex items-center gap-2 text-xs font-semibold ${color}`}><Icon size={16}/>{title}</div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{loading?'…':board[key].total}</p>
          </button>
        ))}
        <button type="button" onClick={() => setHistoryOpen(true)} aria-label="View dismissed incident history"
          className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${historyOpen?'border-red-600 ring-2 ring-red-100':'border-slate-200'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Archive size={16}/>Dismissed</div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{dismissedCount ?? '—'}</p>
        </button>
      </div>
      {activeLane !== 'all' && (
        <button type="button" onClick={() => { setActiveLane('all'); setMobile('candidate'); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200">
          View all incident lanes
        </button>
      )}

      {/* KANBAN BOARD */}
      <div className={`grid gap-3 ${activeLane === 'all' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {COLUMNS.filter(({ key }) => activeLane === 'all' || activeLane === key).map(({
          key,
          title,
          Icon,
          color,
          border,
          badge,
        }) => (
          <section
            key={key}
            className={
              'min-w-0 overflow-hidden rounded-xl border bg-slate-50 lg:flex lg:h-[min(64dvh,690px)] lg:min-h-[340px] lg:flex-col ' +
              border +
              (activeLane === key || (activeLane === 'all' && mobile === key)
                ? ' flex h-[60dvh] min-h-[340px] flex-col'
                : ' hidden')
            }
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
              <span
                className={
                  'flex items-center gap-2 text-sm font-semibold ' +
                  color
                }
              >
                <Icon size={16} />
                {title}
              </span>

              <span
                className={
                  'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ' +
                  badge
                }
              >
                {loading ? '—' : board[key].total}
              </span>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {loading ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Loading...
                </p>
              ) : board[key].items.length ? (
                <>
                  {board[key].items.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      busy={busy}
                      onAction={startDecision}
                      onDetails={setDetails}
                    />
                  ))}

                  {board[key].hasMore && (
                    <button
                      disabled={Boolean(moreLoading)}
                      onClick={() => loadMore(key)}
                      className="min-h-10 w-full rounded-lg border border-slate-200 bg-white text-xs font-semibold disabled:opacity-50"
                    >
                      {moreLoading === key
                        ? 'Loading...'
                        : 'Load More'}
                    </button>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">
                  No incidents found.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* DISMISSED HISTORY */}
      {historyOpen && (
        <Dialog
          title="Dismissed History"
          onClose={() => setHistoryOpen(false)}
        >
          {historyError && (
            <p role="alert" className="mb-3 text-xs text-red-700">
              {historyError}
            </p>
          )}

          {historyLoading ? (
            <p className="py-8 text-sm text-slate-500">
              Loading...
            </p>
          ) : history.items.length ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                {history.total} dismissed incidents · Current filters apply
              </p>

              {history.items.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  historical
                  onDetails={setDetails}
                />
              ))}

              {history.hasMore && (
                <button
                  disabled={historyMoreLoading}
                  onClick={loadMoreHistory}
                  className="min-h-10 w-full rounded-lg border border-slate-200 text-xs font-semibold"
                >
                  {historyMoreLoading
                    ? 'Loading...'
                    : 'Load More'}
                </button>
              )}
            </div>
          ) : (
            <p className="py-8 text-sm text-slate-500">
              No dismissed incidents found.
            </p>
          )}
        </Dialog>
      )}

      {/* INCIDENT DETAILS */}
      {details && (
        <Dialog
          title="Incident Details"
          onClose={() => setDetails(null)}
        >
          <div className="space-y-3 text-sm text-slate-700">
            <h3 className="text-base font-bold text-slate-900">
              {details.issue_label}
            </h3>

            <p>
              <strong>Status:</strong>{' '}
              {({
                candidate: 'Needs Review',
                confirmed: 'Confirmed',
                resolved: 'Resolved',
                dismissed: 'Dismissed',
              })[details.status]}
            </p>

            <p>
              <strong>Location:</strong> {details.location}
            </p>

            <p>
              <strong>Reports:</strong> {details.report_count}{' '}
              ({details.distinct_subscribers} subscribers)
            </p>

            <p>
              <strong>First report:</strong>{' '}
              {formatDate(details.first_reported_at)}
            </p>

            <p>
              <strong>Latest report:</strong>{' '}
              {formatDate(details.last_reported_at)}
            </p>

            {details.confirmed_at && (
              <p>
                <strong>Confirmed:</strong>{' '}
                {formatDate(details.confirmed_at)}
              </p>
            )}

            {details.resolved_at && (
              <p>
                <strong>Resolved:</strong>{' '}
                {formatDate(details.resolved_at)}
              </p>
            )}

            {details.dismissed_at && (
              <p>
                <strong>Dismissed:</strong>{' '}
                {formatDate(details.dismissed_at)}
              </p>
            )}

            {details.notes && (
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                <strong>
                  {details.status === 'dismissed'
                    ? 'Reason:'
                    : 'Admin note:'}
                </strong>{' '}
                {details.notes}
              </p>
            )}
          </div>
        </Dialog>
      )}

      {/* ACTION CONFIRMATION */}
      {decision && (
        <Dialog
          title={
            decision.action === 'confirm'
              ? 'Confirm Incident'
              : decision.action === 'dismiss'
                ? 'Dismiss Incident'
                : 'Mark Resolved'
          }
          onClose={dismissDecision}
          footer={
            <>
              <button
                disabled={Boolean(busy)}
                onClick={dismissDecision}
                className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={
                  Boolean(busy) ||
                  (decision.action === 'dismiss' &&
                    (!reason ||
                      (reason === 'Other' && !notes.trim())))
                }
                onClick={commitDecision}
                className="min-h-10 rounded-lg bg-[#cc0000] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? 'Saving...'
                  : decision.action === 'confirm'
                    ? 'Confirm'
                    : decision.action === 'dismiss'
                      ? 'Dismiss'
                      : 'Resolve'}
              </button>
            </>
          }
        >
          <h3 className="font-semibold text-slate-900">
            {decision.incident.issue_label}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {decision.incident.location}
          </p>

          {decision.action === 'confirm' && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              This sends a service advisory to active subscribers
              in the location.
            </p>
          )}

          {decision.action === 'resolve' && (
            <p className="mt-3 text-xs text-slate-600">
              Individual tickets and technician requests are not changed.
            </p>
          )}

          {decision.action === 'dismiss' && (
            <label className="mt-4 block text-xs font-semibold">
              Reason *

              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="">
                  Select a reason
                </option>

                <option>Not a common outage</option>
                <option>Duplicate report</option>
                <option>Insufficient evidence</option>
                <option>Other</option>
              </select>
            </label>
          )}

          <label className="mt-3 block text-xs font-semibold">
            {decision.action === 'dismiss' && reason === 'Other'
              ? 'Specify reason *'
              : 'Admin note (optional)'}

            <textarea
              rows={3}
              maxLength={900}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm"
            />
          </label>
        </Dialog>
      )}
    </div>
  );
}
