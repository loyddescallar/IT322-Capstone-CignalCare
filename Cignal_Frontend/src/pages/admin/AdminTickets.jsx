import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flag,
  MapPin,
  Search,
  Send,
  X,
  ClipboardList,
  Wrench,
} from 'lucide-react';

import ticketApi from '../../api/ticketApi';
import ChatAttachment from '../../components/ChatAttachment';
import customerApi from '../../api/customerApi';
import {
  formatChatTimestamp,
  getStoredChatUser,
  isOwnMessage,
} from '../../utils/chatUtils';

const LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
const ACTIVE_STATUSES = ['Submitted', 'Under Review', 'Job Order Assigned', 'Resolved'];
const STATUSES = [...ACTIVE_STATUSES, 'Archived'];
const CATEGORIES = ['Billing Concern', 'Technical Problem', 'Connection Issue', 'Technician Request', 'Channel Concern', 'Other'];

const legacyStatusMap = {
  Open: 'Submitted',
  'In Progress': 'Under Review',
  Closed: 'Archived',
};

function displayStatus(status) {
  return legacyStatusMap[status] || status || 'Submitted';
}

function normalizeLocation(location) {
  const value = String(location || '').trim();
  if (!value) return '—';
  if (value.toLowerCase().includes('calaca')) return 'Calaca';
  return value;
}

function isArchived(status) {
  return displayStatus(status) === 'Archived';
}

function isFinished(status) {
  return ['Resolved', 'Archived'].includes(displayStatus(status));
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusStyle = {
  Submitted: 'bg-red-100 text-red-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Job Order Assigned': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
  Archived: 'bg-slate-100 text-slate-600',
};

const statusIcon = {
  Submitted: <Flag size={10} className="text-red-500" />,
  'Under Review': <Clock size={10} className="text-amber-500" />,
  'Job Order Assigned': <Wrench size={10} className="text-blue-500" />,
  Resolved: <CheckCircle2 size={10} className="text-green-500" />,
  Archived: <Archive size={10} className="text-slate-400" />,
};

const statusColor = {
  Submitted: 'text-red-600',
  'Under Review': 'text-amber-600',
  'Job Order Assigned': 'text-blue-600',
  Resolved: 'text-green-600',
  Archived: 'text-slate-500',
};

const statusIconBg = {
  Submitted: 'bg-red-50',
  'Under Review': 'bg-amber-50',
  'Job Order Assigned': 'bg-blue-50',
  Resolved: 'bg-green-50',
  Archived: 'bg-slate-50',
};

const categoryBadge = {
  'Billing Concern': 'bg-purple-50 text-purple-700',
  'Technical Problem': 'bg-blue-50 text-blue-700',
  'Connection Issue': 'bg-orange-50 text-orange-700',
  'Technician Request': 'bg-red-50 text-red-700',
  'Channel Concern': 'bg-teal-50 text-teal-700',
};

export default function AdminTickets() {
  const navigate = useNavigate();
  const currentAdmin = getStoredChatUser(true);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [catFilter, setCat] = useState('All');
  const [locTab, setLocTab] = useState('All');
  const [selectedTicket, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const messagesEndRef = useRef(null);

  async function loadTickets() {
    setLoading(true);
    try {
      const response = await ticketApi.getAdminTickets();
      setTickets(response.data?.tickets || []);
    } catch (error) {
      console.error('LOAD TICKETS ERROR:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadMessages(ticketId) {
    try {
      const response = await ticketApi.getTicketMessages(ticketId);
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error('LOAD MESSAGES ERROR:', error);
    }
  }

  useEffect(() => {
    if (!selectedTicket) return undefined;

    loadMessages(selectedTicket.id);
    const interval = setInterval(() => loadMessages(selectedTicket.id), 4000);

    return () => clearInterval(interval);
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const supportTickets = useMemo(
    () => tickets.filter((ticket) => ticket.category !== 'Technician Request'),
    [tickets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return supportTickets
      .filter((ticket) => locTab === 'All' || normalizeLocation(ticket.location) === locTab)
      .filter((ticket) => {
        const status = displayStatus(ticket.status);
        if (statusFilter === 'All') return status !== 'Archived';
        return status === statusFilter;
      })
      .filter((ticket) => catFilter === 'All' || ticket.category === catFilter)
      .filter((ticket) => {
        if (!q) return true;

        return (
          String(ticket.id).includes(q) ||
          ticket.subject?.toLowerCase().includes(q) ||
          ticket.category?.toLowerCase().includes(q) ||
          ticket.accountName?.toLowerCase().includes(q) ||
          ticket.accountNumber?.toLowerCase().includes(q)
        );
      });
  }, [supportTickets, search, statusFilter, catFilter, locTab]);

  const counts = useMemo(() => {
    const scoped = locTab === 'All'
      ? supportTickets
      : supportTickets.filter((ticket) => normalizeLocation(ticket.location) === locTab);

    return STATUSES.reduce((acc, status) => {
      acc[status] = scoped.filter((ticket) => displayStatus(ticket.status) === status).length;
      return acc;
    }, {});
  }, [supportTickets, locTab]);

  const openTicket = (ticket) => {
    setSelected({ ...ticket, status: displayStatus(ticket.status) });
    setNewMsg('');
    setMessages([]);
  };

  async function handleUpdateStatus(ticketId, status) {
    setUpdating(ticketId);

    try {
      await ticketApi.updateTicketStatus(ticketId, status);
      setTickets((previous) => previous.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)));
      if (selectedTicket?.id === ticketId) setSelected((previous) => (previous ? { ...previous, status } : previous));
    } catch (error) {
      console.error('UPDATE TICKET STATUS ERROR:', error);
    } finally {
      setUpdating(null);
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedTicket || isFinished(selectedTicket.status)) return;

    setSending(true);

    try {
      await ticketApi.sendTicketMessage(selectedTicket.id, newMsg.trim());
      setNewMsg('');
      loadMessages(selectedTicket.id);
    } catch (error) {
      console.error('SEND MESSAGE ERROR:', error);
    } finally {
      setSending(false);
    }
  }

  async function handleArchiveTicket() {
    if (!archiveTarget) return;

    setUpdating(archiveTarget.id);

    try {
      if (typeof ticketApi.archiveTicket === 'function') {
        await ticketApi.archiveTicket(archiveTarget.id);
      } else {
        await ticketApi.deleteTicket(archiveTarget.id);
      }

      setTickets((previous) => previous.map((ticket) => (ticket.id === archiveTarget.id ? { ...ticket, status: 'Archived' } : ticket)));

      if (selectedTicket?.id === archiveTarget.id) {
        setSelected((previous) => (previous ? { ...previous, status: 'Archived' } : previous));
      }

      setArchiveTarget(null);
    } catch (error) {
      console.error('ARCHIVE TICKET ERROR:', error);
    } finally {
      setUpdating(null);
    }
  }

  async function navigateToCustomer(accountNumber) {
    if (!accountNumber) return;

    try {
      const response = await customerApi.getCustomerLookup(accountNumber);
      if (response.data?.user?.id) navigate(`/admin/customers/${response.data.user.id}`);
    } catch (error) {
      console.error('CUSTOMER LOOKUP ERROR:', error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Support Tickets</h1>
          <p className="mt-0.5 text-xs text-gray-500">Review customer concerns, assign job orders, and resolve support tickets</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {STATUSES.map((status) => (
          <div
            key={status}
            onClick={() => setStatus(statusFilter === status ? 'All' : status)}
            className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
              statusFilter === status ? 'border-[#cc0000] ring-1 ring-red-100' : 'border-gray-100'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded ${statusIconBg[status]}`}>{statusIcon[status]}</div>
              <p className="text-xs text-gray-500">{status}</p>
            </div>
            <p className={`text-2xl font-bold ${statusColor[status]}`}>{counts[status] || 0}</p>
            {locTab !== 'All' && <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>{locTab} only</p>}
          </div>
        ))}
      </div>

      {/* Location Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {['All', ...LOCATIONS].map((location) => (
          <button
            key={location}
            type="button"
            onClick={() => setLocTab(location)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              locTab === location
                ? 'bg-[#cc0000] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600'
            }`}
          >
            {location !== 'All' && <MapPin size={10} />}
            {location}
            {location !== 'All' && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${locTab === location ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {supportTickets.filter((ticket) => normalizeLocation(ticket.location) === location).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_380px]">
        {/* Ticket List */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
              <Search size={13} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search subject, ID, account..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder-gray-400"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['All', ...STATUSES].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatus(status)}
                  className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    statusFilter === status ? 'bg-[#cc0000] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              value={catFilter}
              onChange={(event) => setCat(event.target.value)}
              className="ml-auto rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['ID', 'Account', 'Subject', 'Category', 'Location', 'Status', 'Created', ''].map((heading) => (
                    <th key={heading} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500" style={{ fontSize: '10px' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading tickets...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">No tickets found.</td></tr>
                ) : filtered.map((ticket) => {
                  const status = displayStatus(ticket.status);

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => openTicket(ticket)}
                      className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 ${selectedTicket?.id === ticket.id ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-gray-700">#{ticket.id}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); navigateToCustomer(ticket.accountNumber); }}
                          className="text-left transition-colors hover:text-[#cc0000]"
                        >
                          <p className="whitespace-nowrap font-medium text-gray-800">{ticket.accountName || '—'}</p>
                          {ticket.accountNumber && <p className="font-mono text-gray-400" style={{ fontSize: '10px' }}>{ticket.accountNumber}</p>}
                        </button>
                      </td>
                      <td className="max-w-[130px] truncate px-3 py-2 text-gray-600">{ticket.subject}</td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${categoryBadge[ticket.category] || 'bg-gray-100 text-gray-600'}`}>{ticket.category}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1"><MapPin size={9} className="text-gray-400" /><span className="whitespace-nowrap text-gray-500">{normalizeLocation(ticket.location)}</span></div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">{statusIcon[status]}<span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusStyle[status]}`}>{status}</span></div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-400" style={{ fontSize: '10px' }}>{formatDate(ticket.created_at)}</td>
                      <td className="px-3 py-2"><ChevronRight size={13} className="text-gray-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-400">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>

        {/* Detail + Chat Panel */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm" style={{ minHeight: '400px' }}>
          {!selectedTicket ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-400">
              <Search size={32} className="mb-3 text-gray-200" />
              <p className="text-xs font-medium text-gray-500">Select a ticket to view details and respond</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 border-b border-gray-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">#{selectedTicket.id}</span>
                    <div className="flex items-center gap-1">{statusIcon[displayStatus(selectedTicket.status)]}<span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusStyle[displayStatus(selectedTicket.status)]}`}>{displayStatus(selectedTicket.status)}</span></div>
                    {selectedTicket.location && <div className="flex items-center gap-1"><MapPin size={9} className="text-gray-400" /><span className="text-xs text-gray-500">{normalizeLocation(selectedTicket.location)}</span></div>}
                  </div>
                  <p className="mt-1 text-xs font-bold leading-snug text-gray-800">{selectedTicket.subject}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-gray-500" style={{ fontSize: '10px' }}>{selectedTicket.accountName} · {selectedTicket.accountNumber}</p>
                    <button type="button" onClick={() => navigateToCustomer(selectedTicket.accountNumber)} className="flex items-center gap-0.5 text-[#cc0000] hover:underline" style={{ fontSize: '10px' }}><ExternalLink size={9} /> View Profile</button>
                  </div>
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${categoryBadge[selectedTicket.category] || 'bg-gray-100 text-gray-600'}`}>{selectedTicket.category}</span>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>

              <div className="border-b border-gray-100 px-4 py-2">
                <p className="mb-1.5 text-xs text-gray-500">Update Status:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updating === selectedTicket.id}
                      onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        displayStatus(selectedTicket.status) === status
                          ? 'border-[#cc0000] bg-red-50 text-[#cc0000]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/50 p-3" style={{ maxHeight: '240px' }}>
                {messages.length === 0 ? (
                  <p className="mt-6 text-center text-xs text-gray-400">No messages yet.</p>
                ) : messages.map((message, index) => {
                  const mine = isOwnMessage(message, currentAdmin);
                  const senderLabel = mine
                    ? 'You (Admin)'
                    : message.sender_name || message.accountName || 'Customer';

                  return (
                    <div
                      key={message.id || `${message.created_at}-${index}`}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <span className="mb-1 px-1 text-[9px] font-semibold text-gray-400">
                          {senderLabel}
                        </span>
                        <div className={`rounded-xl px-3 py-2 text-xs ${mine ? 'rounded-br-sm bg-[#cc0000] text-white' : 'rounded-bl-sm border border-gray-200 bg-white text-gray-800 shadow-sm'}`}>
                          {message.message && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                          )}
                          {message.attachment && (
                            <ChatAttachment
                              message={message}
                              mine={mine}
                              compact
                            />
                          )}
                          <p className={`mt-1 text-right ${mine ? 'text-red-200' : 'text-gray-400'}`} style={{ fontSize: '9px' }}>
                            {formatChatTimestamp(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="space-y-2 border-t border-gray-100 p-3">
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => navigate(`/admin/chat/${selectedTicket.id}`)} className="rounded-lg border border-[#cc0000] px-3 py-1.5 text-xs font-medium text-[#cc0000] transition-colors hover:bg-red-50">Open Full Chat</button>
                  {!isArchived(selectedTicket.status) && (
                    <button type="button" onClick={() => setArchiveTarget(selectedTicket)} className="ml-auto rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50">Archive</button>
                  )}
                </div>

                {isFinished(selectedTicket.status) ? (
                  <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-center text-xs font-semibold text-green-700">
                    This ticket is {displayStatus(selectedTicket.status).toLowerCase()}. Replies are disabled.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMsg}
                      onChange={(event) => setNewMsg(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                      placeholder="Type a reply..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                    />
                    <button type="button" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="rounded-lg bg-[#cc0000] px-3 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"><Send size={13} /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">Archive Ticket</h2>
              <button type="button" onClick={() => setArchiveTarget(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-5">
              <p className="text-xs leading-relaxed text-gray-600">
                Archive ticket <span className="font-semibold">#{archiveTarget.id}</span> — "{archiveTarget.subject}"? This will hide it from the active ticket list while keeping it as a record.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={handleArchiveTicket} disabled={updating === archiveTarget.id} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
                  {updating === archiveTarget.id ? 'Archiving...' : 'Archive'}
                </button>
                <button type="button" onClick={() => setArchiveTarget(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
