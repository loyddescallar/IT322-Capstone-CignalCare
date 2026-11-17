import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, Flag, History, Ticket, UserRound, Wrench, AlertTriangle } from 'lucide-react';
import UserPageShell from '../../components/UserPageShell';
import RequestTimeline from '../../components/RequestTimeline';
import ticketApi from '../../api/ticketApi';
import axiosClient from '../../api/axiosClient';

const ACTIVE_STATUSES = ['Submitted', 'Under Review', 'Job Order Assigned', 'Resolved'];
const STATUSES = [...ACTIVE_STATUSES, 'Archived'];

const legacyStatusMap = {
  Open: 'Submitted',
  'In Progress': 'Under Review',
  Closed: 'Archived',
};

function displayStatus(status) {
  return legacyStatusMap[status] || status || 'Submitted';
}

const STATUS_BADGE = {
  Submitted: 'bg-red-100 text-red-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Job Order Assigned': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
  Archived: 'bg-slate-100 text-slate-600',
};

const STATUS_ICON = {
  Submitted: <Flag size={11} className="text-red-500" />,
  'Under Review': <Clock size={11} className="text-amber-500" />,
  'Job Order Assigned': <Wrench size={11} className="text-blue-500" />,
  Resolved: <CheckCircle2 size={11} className="text-green-500" />,
  Archived: <Archive size={11} className="text-slate-400" />,
};

const STATUS_COLOR = {
  Submitted: 'text-red-600',
  'Under Review': 'text-amber-600',
  'Job Order Assigned': 'text-blue-600',
  Resolved: 'text-green-600',
};

const TECH_BADGE = {
  Submitted: 'bg-red-100 text-red-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

const CAT_BADGE = {
  'Billing Concern': 'bg-purple-50 text-purple-700',
  'Technical Problem': 'bg-blue-50 text-blue-700',
  'Connection Issue': 'bg-orange-50 text-orange-700',
  'Technician Request': 'bg-red-50 text-red-700',
  'Channel Concern': 'bg-teal-50 text-teal-700',
};

function timeAgo(dateValue) {
  if (!dateValue) return '—';

  const diff = (Date.now() - new Date(dateValue).getTime()) / 1000;

  if (Number.isNaN(diff)) return '—';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return `${Math.floor(diff / 86400)}d ago`;
}

const READ_KEY = 'cignalcare_read_tickets';
function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function markRead(id) {
  const set = getReadSet();
  set.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

export default function UserTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [techReqs, setTechReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState('All');
  const [pastOpen, setPastOpen] = useState(false);
  const [sortOrder, setSort] = useState('newest');
  const [readSet, setReadSet] = useState(getReadSet());

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const [ticketRes, techRes] = await Promise.all([
          ticketApi.getMyTickets(),
          axiosClient.get('/technicians/requests/my').catch(() => ({ data: { requests: [] } })),
        ]);

        setTickets(ticketRes.data?.tickets || []);
        setTechReqs(techRes.data?.requests || []);
      } catch (error) {
        console.error('LOAD USER TICKETS ERROR:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const scoped = tickets.filter((ticket) => {
      const status = displayStatus(ticket.status);
      if (statusFilter === 'All') return !['Resolved', 'Archived'].includes(status);
      return status === statusFilter;
    });

    return sortOrder === 'newest'
      ? [...scoped].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : [...scoped].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [tickets, statusFilter, sortOrder]);

  const pastTickets = useMemo(() => {
    const history = tickets.filter((ticket) => ['Resolved', 'Archived'].includes(displayStatus(ticket.status)));
    return [...history].sort((a, b) => sortOrder === 'newest'
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
  }, [tickets, sortOrder]);
  const visiblePastTickets = statusFilter === 'Resolved'
    ? pastTickets.filter((ticket) => displayStatus(ticket.status) === 'Resolved')
    : pastTickets;

  const counts = useMemo(
    () => STATUSES.reduce((acc, status) => {
      acc[status] = tickets.filter((ticket) => displayStatus(ticket.status) === status).length;
      return acc;
    }, {}),
    [tickets]
  );

  const pendingTech = techReqs.filter((request) => !['Completed', 'Cancelled', 'Canceled'].includes(request.status)).length;

  const handleTicketClick = (ticket) => {
    markRead(ticket.id);
    setReadSet(getReadSet());
    navigate(`/user/chat/${ticket.id}`);
  };

  return (
    <UserPageShell
      title="My Support Tickets"
      description="Track support concerns and technician requests from submission to completion."
      icon={Ticket}
      actions={(
        <button onClick={() => navigate('/user/report-problem')} className="rounded-xl bg-[#cc0000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700">+ New Ticket</button>
      )}
      contentClassName="space-y-5"
    >

        {/* KPI Status Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ACTIVE_STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              aria-pressed={statusFilter === status}
              onClick={() => {
                if (status === 'Resolved') {
                  const selected = statusFilter !== 'Resolved';
                  setStatus(selected ? 'Resolved' : 'All');
                  setPastOpen(selected);
                } else {
                  setStatus(statusFilter === status ? 'All' : status);
                  setPastOpen(false);
                }
              }}
              className={`min-h-[92px] cursor-pointer rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cc0000] sm:p-4 ${
                statusFilter === status ? 'border-[#cc0000] ring-1 ring-red-100' : 'border-gray-100'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">{STATUS_ICON[status]}<p className="text-xs text-gray-500">{status}</p></div>
              <p className={`text-2xl font-bold ${STATUS_COLOR[status]}`}>{counts[status] || 0}</p>
            </button>
          ))}
        </div>

        {/* Clickable KPI cards handle status selection; keep only useful tools here. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={statusFilter === 'All'} onClick={() => { setStatus('All'); setPastOpen(false); }}
              className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${statusFilter === 'All' ? 'bg-[#cc0000] text-white' : 'border border-gray-200 bg-white text-slate-700 hover:border-red-200'}`}>
              All Active
            </button>
            {statusFilter !== 'All' && statusFilter !== 'Resolved' && (
              <button type="button" onClick={() => setStatus('All')} className="min-h-10 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[#a60000] hover:bg-red-100"
                title="Clear selected status filter" aria-label={`Clear ${statusFilter} filter`}>
                {statusFilter} ×
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="mr-auto text-xs text-gray-500 sm:mr-2" aria-live="polite">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
            <label htmlFor="my-tickets-sort" className="text-xs font-medium text-slate-600">Sort</label>
            <select id="my-tickets-sort" value={sortOrder} onChange={(event) => setSort(event.target.value)}
              className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#cc0000]">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Current tickets only; resolved and archived records remain reachable below. */}
        {statusFilter === 'Resolved' ? (
          <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">Resolved tickets are shown in Past Tickets below.</p>
        ) : (
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-400">
              <Ticket size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{statusFilter === 'All' ? 'No active tickets yet.' : `No ${statusFilter.toLowerCase()} tickets found.`}</p>
              {statusFilter === 'All' && <button type="button" onClick={() => navigate('/user/report-problem')} className="mt-3 min-h-10 text-sm font-semibold text-[#cc0000] hover:underline">File your first ticket →</button>}
            </div>
          ) : filtered.map((ticket) => {
            const status = displayStatus(ticket.status);
            const isNew = !readSet.has(ticket.id) && !['Resolved', 'Archived'].includes(status);

            return (
              <div
                key={ticket.id}
                role="button"
                tabIndex={0}
                aria-label={`Open support ticket #${ticket.id}: ${ticket.subject}`}
                onClick={() => handleTicketClick(ticket)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleTicketClick(ticket);
                  }
                }}
                className="group flex cursor-pointer flex-col items-stretch justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cc0000] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">#{ticket.id}</span>
                    <div className="flex items-center gap-1">{STATUS_ICON[status]}<span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span></div>
                    {ticket.category && <span className={`rounded px-2 py-0.5 text-xs font-medium ${CAT_BADGE[ticket.category] || 'bg-gray-100 text-gray-600'}`}>{ticket.category}</span>}
                    {isNew && <span className="animate-pulse rounded-full bg-[#cc0000] px-2 py-0.5 text-xs font-bold text-white">NEW</span>}
                  </div>
                  <p className="truncate text-sm font-semibold text-gray-800">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{timeAgo(ticket.created_at)}</p>
                  <div className="mt-3 hidden max-w-sm sm:block">
                    <RequestTimeline steps={ACTIVE_STATUSES} current={status === 'Archived' ? 'Resolved' : status} compact />
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center justify-end gap-2 self-end sm:self-auto">
                  <span className="text-xs font-semibold text-[#cc0000] opacity-0 transition-opacity group-hover:opacity-100">View ticket</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Resolved and archived history is available without a technical Archived filter. */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Past Tickets">
          <button type="button" aria-expanded={pastOpen} aria-controls="past-tickets-list"
            onClick={() => {
              if (pastOpen && statusFilter === 'Resolved') setStatus('All');
              setPastOpen(!pastOpen);
            }}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#cc0000] sm:px-5">
            <span className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-gray-800 sm:text-base">
              <History size={19} className="shrink-0 text-gray-600" aria-hidden="true" />
              Past Tickets
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{pastTickets.length}</span>
            </span>
            <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-gray-500 transition-transform ${pastOpen ? 'rotate-180' : ''}`} />
          </button>
          {pastOpen && (
            <div id="past-tickets-list" className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-3 sm:p-4">
              {loading ? (
                <p className="p-4 text-center text-sm text-gray-500">Loading past tickets...</p>
              ) : visiblePastTickets.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">No past tickets found.</p>
              ) : visiblePastTickets.map((ticket) => {
                const status = displayStatus(ticket.status);
                return (
                  <button key={`past-${ticket.id}`} type="button" onClick={() => handleTicketClick(ticket)}
                    aria-label={`Open past support ticket #${ticket.id}: ${ticket.subject || 'Support concern'}`}
                    className="flex min-h-16 w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-red-200 hover:bg-red-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cc0000] sm:items-center sm:p-4">
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{ticket.id}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                      </span>
                      <span className="block truncate text-sm font-semibold text-gray-800">{ticket.subject || 'Support concern'}</span>
                      <span className="mt-1 block text-xs text-gray-500">{timeAgo(ticket.created_at)}</span>
                    </span>
                    <ChevronRight size={18} className="mt-3 shrink-0 text-gray-400 sm:mt-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Technician Requests Section */}
        <div>
          <div className="mb-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-gray-600" />
              <h2 className="text-lg font-bold text-gray-800">My Technician Requests</h2>
              {pendingTech > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pendingTech} pending</span>}
            </div>
            <button onClick={() => navigate('/user/technician-request')} className="w-full rounded-xl bg-[#cc0000] px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 sm:w-auto">+ New Request</button>
          </div>

          {pendingTech > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700">You have {pendingTech} pending technician request{pendingTech > 1 ? 's' : ''} awaiting confirmation. Our team will contact you shortly.</p>
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading...</div>
            ) : techReqs.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-400">
                <Wrench size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No technician requests yet.</p>
              </div>
            ) : techReqs.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Wrench size={12} className="flex-shrink-0 text-blue-500" />
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TECH_BADGE[request.status] || 'bg-gray-100 text-gray-600'}`}>{request.status}</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-gray-800">{request.issueDescription}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="text-xs text-gray-400">Submitted: {new Date(request.created_at || '').toLocaleDateString('en-PH')}</p>
                      {request.preferred_date && <p className="flex items-center gap-1 text-xs font-semibold text-blue-600"><CalendarDays size={12} /> Scheduled: {request.preferred_date}</p>}
                      {request.technician_name && <p className="flex items-center gap-1 text-xs text-gray-500"><UserRound size={12} /> {request.technician_name}</p>}
                    </div>
                    {request.admin_note && <p className="mt-1 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-500">Admin note: {request.admin_note}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
    </UserPageShell>
  );
}
