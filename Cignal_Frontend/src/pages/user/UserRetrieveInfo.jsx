import { useState } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronUp, User, Tv, CreditCard, Wrench, Ticket, FileSearch, AlertTriangle } from 'lucide-react';
import UserPageShell from '../../components/UserPageShell';
import axiosClient from '../../api/axiosClient';

const STATUS_BADGE = { Received:'bg-blue-100 text-blue-700', 'Under Review':'bg-amber-100 text-amber-700', Attending:'bg-purple-100 text-purple-700', Completed:'bg-green-100 text-green-700', Rejected:'bg-red-100 text-red-700' };
const TECH_BADGE  = { Submitted:'bg-red-100 text-red-700', 'Under Review':'bg-amber-100 text-amber-700', Scheduled:'bg-blue-100 text-blue-700', Completed:'bg-green-100 text-green-700', Cancelled:'bg-slate-100 text-slate-600'  };
const TICKET_BADGE= { Submitted:'bg-red-100 text-red-700', 'Under Review':'bg-amber-100 text-amber-700', 'Job Order Assigned':'bg-blue-100 text-blue-700', Resolved:'bg-green-100 text-green-700', Archived:'bg-slate-100 text-slate-600' };
function displayTicketStatus(status){ const legacy={Open:'Submitted','In Progress':'Under Review',Closed:'Archived'}; return legacy[status]||status||'Submitted'; }

function formatDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}); }
function timeAgo(d) { if(!d) return '—'; const diff=(Date.now()-new Date(d).getTime())/1000; if(diff<60)return 'just now'; if(diff<3600)return Math.floor(diff/60)+'m ago'; if(diff<86400)return Math.floor(diff/3600)+'h ago'; return Math.floor(diff/86400)+'d ago'; }
function getActivityStatus(lastLoadDate) { if(!lastLoadDate)return 'Inactive'; const days=(Date.now()-new Date(lastLoadDate).getTime())/86400000; if(days<=30)return 'Active'; if(days<=60)return 'At Risk'; return 'Inactive'; }

export default function UserRetrieveInfo() {
  const [query,setQuery]     = useState('');
  const [result,setResult]   = useState(null);
  const [extraData,setExtra] = useState({});
  const [loading,setLoading] = useState(false);
  const [notFound,setNotFound] = useState(false);
  const [copied,setCopied]   = useState('');
  const [open,setOpen]       = useState({ account:true, status:true, load:true, loadReqs:false, tech:false, tickets:false });

  const copyText=(text,key)=>{ navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(''),2000);}); };
  const toggle=key=>setOpen(p=>({...p,[key]:!p[key]}));

  const handleSearch=async e=>{
    e.preventDefault(); if(!query.trim())return;
    setLoading(true);setNotFound(false);setResult(null);setExtra({});
    try {
      const r=await axiosClient.get('/customers/'+query.trim());
      const c=r.data?.user||r.data;
      setResult(c);
      // Fetch extra data using the user's accountNumber
      if(c?.accountNumber){
        const [lrRes,techRes,ticketRes,loadRes]=await Promise.allSettled([
          axiosClient.get('/load-requests/my').catch(()=>({data:{requests:[]}})),
          axiosClient.get('/technicians/requests/my').catch(()=>({data:{requests:[]}})),
          axiosClient.get('/tickets/my').catch(()=>({data:{tickets:[]}})),
          axiosClient.get('/load/my').catch(()=>({data:{history:[]}})),
        ]);
        const allLoadReqs=(lrRes.status==='fulfilled'?lrRes.value.data?.requests||[]:[]).filter((request) => String(request.account_number || '') === String(c.accountNumber || ''));
        setExtra({
          loadRequests: allLoadReqs,
          techRequests: techRes.status==='fulfilled'?techRes.value.data?.requests||[]:[], 
          tickets:      ticketRes.status==='fulfilled'?ticketRes.value.data?.tickets||[]:[], 
          loadHistory:  loadRes.status==='fulfilled'?loadRes.value.data?.history||[]:[], 
        });
      }
    } catch { setNotFound(true); } finally { setLoading(false); }
  };

  const actStatus = result ? getActivityStatus(result.lastLoadDate) : null;
  const actColor = actStatus==='Active'?'bg-green-50 border-green-200 text-green-700':actStatus==='At Risk'?'bg-amber-50 border-amber-200 text-amber-700':'bg-red-50 border-red-200 text-red-700';

  const Section=({skey,label,icon,children,className=''})=>(
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <button onClick={()=>toggle(skey)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">{icon}{label}</div>
        {open[skey]?<ChevronUp size={16} className="text-gray-400"/>:<ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {open[skey]&&<div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
    </div>
  );

  return (
    <UserPageShell
      title="Account Inquiry"
      description="Retrieve your subscriber details, load activity, service requests, and support history."
      icon={FileSearch}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Find subscriber record</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use the Account Number or CCA Number registered to your profile.</p>
            <form onSubmit={handleSearch} className="mt-4 space-y-3">
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Account No. or CCA Number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" />
              <button type="submit" disabled={loading || !query.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Search size={15} /> {loading ? 'Searching...' : 'Search Account'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
              <div><p className="text-sm font-bold text-blue-800">Keep account details private</p><p className="mt-1 text-xs leading-5 text-blue-700">Only search for the subscriber account connected to your service. Do not share account or CCA numbers publicly.</p></div>
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current record</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{result.accountName}</p>
              <p className="mt-1 text-sm text-slate-500">Account {result.accountNumber}</p>
              <button onClick={()=>copyText(`Name: ${result.accountName}\nAccount: ${result.accountNumber}\nCCA: ${result.ccaNumber}\nPhone: ${result.phone}\nAddress: ${result.address}`,'all')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cc0000] px-3 py-2.5 text-xs font-semibold text-[#cc0000] hover:bg-red-50">
                {copied==='all'?<Check size={13}/>:<Copy size={13}/>} {copied==='all'?'Copied':'Copy Account Details'}
              </button>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          {notFound && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">No subscriber record was found for “{query}”. Check the number and try again.</div>}

          {!result && !notFound && !loading && (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#cc0000]"><FileSearch size={26} /></div>
              <h2 className="mt-4 text-lg font-bold text-slate-800">Subscriber information will appear here</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Search using your account or CCA number to review credentials, status, loads, technician visits, and support tickets.</p>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">Retrieving account information...</div>
          )}

          {result && !loading && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section skey="account" label="Account Credentials" icon={<User size={14} className="text-[#cc0000]"/>}>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  {[{label:'Account Name',value:result.accountName},{label:'Account No.',value:result.accountNumber},{label:'CCA No.',value:result.ccaNumber},{label:'Phone',value:result.phone},{label:'Location',value:result.location||'—'},{label:'Address',value:result.address}].map(field=>(
                    <div key={field.label} className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</p>
                      <div className="mt-1 flex items-center gap-1.5"><p className="min-w-0 break-words text-sm font-semibold text-slate-800">{field.value || '—'}</p><button onClick={()=>copyText(String(field.value || ''),field.label)} className="flex-shrink-0 text-slate-300 hover:text-[#cc0000]">{copied===field.label?<Check size={11}/>:<Copy size={11}/>}</button></div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section skey="status" label="Account Status" icon={<Tv size={14} className="text-[#cc0000]"/>}>
                <div className={`mt-3 flex items-center justify-between rounded-xl border p-3 ${actColor}`}>
                  <div><p className="text-xs font-semibold">{actStatus} Account</p><p className="mt-0.5 text-xs opacity-80">Last load: {result.lastLoadDate?formatDate(result.lastLoadDate):'No record'}</p></div>
                  <span className={`text-lg font-bold ${actStatus==='Active'?'text-green-600':actStatus==='At Risk'?'text-amber-600':'text-red-600'}`}>{actStatus==='Active'?'✓':actStatus==='At Risk'?'!':'×'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[{label:'Status',value:result.status||'active'},{label:'Member Since',value:formatDate(result.created_at)},{label:'Coverage Area',value:result.location||'—'},{label:'Account Type',value:result.role}].map(field=>(
                    <div key={field.label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-800">{field.value}</p></div>
                  ))}
                </div>
              </Section>

              <Section skey="load" label="Load Transaction History" icon={<CreditCard size={14} className="text-[#cc0000]"/>} className="lg:col-span-2">
                {extraData.loadHistory?.length===0?<p className="py-8 text-center text-sm text-slate-400">No load transactions found.</p>:(
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead><tr className="border-b border-slate-100">{['Date','Amount','Description','Status'].map(header=><th key={header} className="py-2 text-left text-[10px] font-semibold uppercase text-slate-400">{header}</th>)}</tr></thead>
                      <tbody>{(extraData.loadHistory||[]).slice(0,8).map((transaction,index)=><tr key={transaction.id || index} className="border-b border-slate-50 last:border-0"><td className="py-3 text-slate-500">{formatDate(transaction.created_at)}</td><td className="py-3 font-bold text-[#cc0000]">₱{Number(transaction.loadAmount||0).toLocaleString()}</td><td className="py-3 text-slate-600">{transaction.description||'—'}</td><td className="py-3"><span className={`rounded-full px-2 py-0.5 font-semibold ${transaction.status==='completed'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{transaction.status}</span></td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section skey="loadReqs" label="Remote Load Requests" icon={<CreditCard size={14} className="text-blue-500"/>}>
                {extraData.loadRequests?.length===0?<p className="py-8 text-center text-sm text-slate-400">No load requests found.</p>:(
                  <div className="mt-3 space-y-2">{(extraData.loadRequests||[]).slice(0,6).map((request,index)=>(
                    <div key={request.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{request.plan_name} — ₱{Number(request.amount||0).toLocaleString()}</p><p className="mt-0.5 truncate text-xs text-slate-400">{request.payment_method} · {request.reference_no || 'No reference'} · {formatDate(request.created_at)}</p></div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[request.status]||'bg-slate-100 text-slate-600'}`}>{request.status || 'Received'}</span>
                    </div>
                  ))}</div>
                )}
              </Section>

              <Section skey="tech" label="Technician and Repair History" icon={<Wrench size={14} className="text-blue-500"/>}>
                {extraData.techRequests?.length===0?<p className="py-8 text-center text-sm text-slate-400">No technician requests found.</p>:(
                  <div className="mt-3 space-y-2">{(extraData.techRequests||[]).slice(0,6).map((request,index)=>(
                    <div key={request.id || index} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{request.issueDescription}</p><p className="mt-0.5 text-xs leading-5 text-slate-400">Submitted: {formatDate(request.created_at)}{request.preferred_date?` · Preferred: ${request.preferred_date}`:''}{request.technician_name?` · Technician: ${request.technician_name}`:''}</p></div><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TECH_BADGE[request.status]||'bg-slate-100 text-slate-600'}`}>{request.status || 'Submitted'}</span></div>
                    </div>
                  ))}</div>
                )}
              </Section>

              <Section skey="tickets" label="Support Tickets Summary" icon={<Ticket size={14} className="text-purple-500"/>} className="lg:col-span-2">
                {extraData.tickets?.length===0?<p className="py-8 text-center text-sm text-slate-400">No support tickets found.</p>:(
                  <>
                    <div className="mb-3 mt-3 grid grid-cols-2 gap-3">
                      {[{label:'Total Tickets',value:extraData.tickets?.length||0},{label:'Needs Review',value:extraData.tickets?.filter(ticket=>['Submitted','Under Review','Open','In Progress'].includes(ticket.status)).length||0}].map(stat=><div key={stat.label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p><p className="mt-1 text-xl font-bold text-slate-800">{stat.value}</p></div>)}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">{(extraData.tickets||[]).slice(0,8).map((ticket,index)=>(
                      <div key={ticket.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{ticket.subject}</p><p className="mt-0.5 text-xs text-slate-400">#{ticket.id} · {ticket.category} · {timeAgo(ticket.created_at)}</p></div><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TICKET_BADGE[displayTicketStatus(ticket.status)]||'bg-slate-100 text-slate-600'}`}>{displayTicketStatus(ticket.status)}</span></div>
                    ))}</div>
                  </>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </UserPageShell>
  );

}
