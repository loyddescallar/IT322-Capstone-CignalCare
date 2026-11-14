import { useCallback, useEffect, useState } from 'react';
import { PhoneCall, CalendarClock, ClipboardList, AlertCircle, CheckCircle2 } from 'lucide-react';
import ticketApi from '../api/ticketApi';
import useVisibleRefresh from '../hooks/useVisibleRefresh';

const OUTCOMES=[
 ['resolved','Issue Resolved','Thank you for speaking with our support team. Based on our phone conversation, your reported issue has been resolved. Please contact us through this ticket if it happens again.'],
 ['technician','Technician Required','Thank you for speaking with our support team. Your issue requires further technician inspection. Our team will update this ticket when the service arrangements are confirmed.'],
 ['troubleshoot','Further Troubleshooting','Thank you for speaking with our support team. Further troubleshooting is needed. We will share the next instructions through this ticket.'],
 ['noanswer','No Answer','Our support team attempted to contact you about this ticket but could not reach you. Please reply here when you are available.'],
 ['callback','Callback Requested','Thank you for speaking with our support team. We have noted your request for a callback and will follow up according to the agreed arrangement.'],
 ['invalid','Invalid Contact Number','We could not reach you using the number provided for this ticket. Please check your contact details or reply here so we can assist you.'],
];
function newCallKey(){return globalThis.crypto?.randomUUID?.() || `call-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;}
const field='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-red-500 focus:outline-none';
export default function TicketCallSupport({ticket,onSaved}) {
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [outcome,setOutcome]=useState('technician');
 const [message,setMessage]=useState(OUTCOMES[1][2]);
 const [notes,setNotes]=useState('');
 const [phone,setPhone]=useState('');
 const [callbackAt,setCallbackAt]=useState('');
 const [markResolved,setMarkResolved]=useState(false);
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState(false);
 const [requestKey,setRequestKey]=useState(newCallKey);
 const load=useCallback(async(signal)=>{
   const r=await ticketApi.getAdminTicketSupport(ticket.id,{signal});
   if(!signal?.aborted){setData(r.data);setPhone(previous=>previous || r.data?.support?.contact_phone || '');}
 },[ticket.id]);
 useEffect(()=>{
   const ctrl=new AbortController();let active=true;
   setData(null);setPhone('');setLoading(true);setError('');setSaved(false);setOutcome('technician');
   setMessage(OUTCOMES[1][2]);setNotes('');setCallbackAt('');setMarkResolved(false);setRequestKey(newCallKey());
   load(ctrl.signal).catch(e=>{if(active&&e?.code!=='ERR_CANCELED')setError(e?.response?.data?.error||'Unable to load contact and call history.');})
      .finally(()=>{if(active)setLoading(false);});
   return ()=>{active=false;ctrl.abort();};
 },[load]);
 useVisibleRefresh(()=>load(),30000,Boolean(data) && !saving);
 const chooseOutcome=value=>{
   setOutcome(value);setMessage(OUTCOMES.find(x=>x[0]===value)?.[2]||'');
   // Selecting a resolved call is explicit confirmation that this ticket
   // should close when the admin clicks Confirm & Send.
   setMarkResolved(value==='resolved');setSaved(false);
 };
 const submit=async(e)=>{
   e.preventDefault();setError('');setSaved(false);setSaving(true);
   try{
     const r=await ticketApi.recordTicketCall(ticket.id,{
       outcome,phone,notes,message,callbackAt:callbackAt ? new Date(callbackAt).toISOString() : null,markResolved,requestKey,
     });
     setSaved(true);setRequestKey(newCallKey());setNotes('');setCallbackAt('');setMarkResolved(false);
     await load();onSaved?.(r.data.call);
   }catch(err){setError(err.response?.data?.error||err.message||'Unable to record call.');}
   finally{setSaving(false);}
 };
 const support=data?.support;
 const isClosed=['Resolved','Archived'].includes(ticket.status);
 const numbers=[support?.contact_phone,support?.alternative_phone].filter(Boolean);
 return <section className="space-y-3 border-b border-gray-100 bg-white px-3 py-4">
   <div className="flex items-center gap-2"><PhoneCall size={16} className="text-[#cc0000]"/><h3 className="text-xs font-bold text-gray-800">Customer Contact & Call Follow-up</h3></div>
   {loading ? <p className="text-xs text-gray-500">Loading contact details...</p> : !data ?
    <p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{error||'Call details unavailable.'}</p> : <>
      {support?.issue_label && <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
        <strong>Reported symptom:</strong> {support.issue_label}
        {support.receiver_model && <p>Receiver: {support.receiver_model}</p>}
        {support.receiver_code && <p>Error code: {support.receiver_code}</p>}
        {Object.entries(support.diagnostics||{}).map(([name,value])=><p key={name} className="break-words">{name.replace(/_/g,' ')}: {String(value)}</p>)}
      </div>}
      {data.reply?.over24Hours && <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800"><AlertCircle size={12} className="mr-1 inline"/>Awaiting customer reply for over 24 hours. Consider a phone follow-up.</p>}
      {!data.reply?.over24Hours && data.reply?.awaitingReply && <p className="text-xs text-slate-500">Awaiting customer reply to the latest admin message.</p>}
      <div className="text-xs text-slate-600"><strong>Preferred:</strong> {support?.preferred_contact||'Website Chat'} · <strong>Email:</strong> {support?.contact_email||'Not provided'}</div>
      {isClosed && <p className="rounded-lg bg-green-50 p-2 text-xs font-semibold text-green-800">This ticket is closed. Call records are read-only.</p>}
      <form onSubmit={submit} className="space-y-2">
        <label className="block text-xs font-semibold text-slate-600">Ticket Contact Number
          <select className={`${field} mt-1`} value={phone} onChange={e=>setPhone(e.target.value)} disabled={saving || isClosed}>
            {!numbers.length && <option value="">No number available</option>}
            {numbers.map(n=><option value={n} key={n}>{n}</option>)}
          </select>
        </label>
        {phone ? <a className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-50" href={`tel:${phone}`}><PhoneCall size={13}/>Call Customer (device dialer)</a>:
          <p className="text-xs text-amber-700">No mobile number supplied. Ask for contact details in the ticket conversation.</p>}
        <label className="block text-xs font-semibold text-slate-600">Call Outcome
          <select className={`${field} mt-1`} value={outcome} onChange={e=>chooseOutcome(e.target.value)} disabled={saving || isClosed}>
            {OUTCOMES.map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        {outcome==='callback' && <label className="block text-xs font-semibold text-slate-600"><CalendarClock size={13} className="mr-1 inline"/>Callback Date & Time
          <input className={`${field} mt-1`} type="datetime-local" required value={callbackAt} onChange={e=>setCallbackAt(e.target.value)} disabled={saving || isClosed}/>
        </label>}
        <label className="block text-xs font-semibold text-slate-600">Private Admin Call Notes (Optional)
          <textarea rows={2} maxLength={2000} className={`${field} mt-1`} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What was discussed?" disabled={saving || isClosed}/>
        </label>
        <label className="block text-xs font-semibold text-slate-600">Prefilled Message — Visible to Subscriber
          <textarea required rows={4} maxLength={2000} className={`${field} mt-1`} value={message} onChange={e=>setMessage(e.target.value)} disabled={saving || isClosed}/>
        </label>
        {outcome==='resolved' && <label className="flex items-start gap-2 text-xs text-slate-600">
          <input className="mt-0.5" type="checkbox" checked={markResolved} onChange={e=>setMarkResolved(e.target.checked)} disabled={saving || isClosed}/>
          Also mark this ticket Resolved after saving the call and sending the message.
        </label>}
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}
        {saved && <div role="status" className="space-y-2 rounded-lg border border-green-100 bg-green-50 p-2 text-xs text-green-700">
          <p className="flex items-center gap-1"><CheckCircle2 size={13}/>Call record and subscriber message saved.</p>
          {!isClosed && <button type="button" className="font-semibold underline" onClick={()=>{
            setSaved(false);setRequestKey(newCallKey());setNotes('');setCallbackAt('');
            setOutcome('technician');setMessage(OUTCOMES[1][2]);setMarkResolved(false);
          }}>Record another call</button>}
        </div>}
        <button type="submit" disabled={saving || saved || isClosed || (outcome==='resolved' && !markResolved) || !phone || !message.trim()} className="w-full rounded-lg bg-[#cc0000] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          {saving?'Saving...':saved?'Follow-up Recorded':'Confirm & Send Follow-up'}
        </button>
        {saved && outcome==='technician' && !isClosed &&
          <a href="/admin/technicians" className="block rounded-lg border border-blue-200 px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50">
            Review Technician Requests (no visit is booked automatically)
          </a>}
      </form>
      {data.calls?.length>0 && <details className="rounded-lg border border-slate-200 p-2 text-xs">
        <summary className="flex cursor-pointer items-center gap-1 font-semibold text-slate-700"><ClipboardList size={13}/>Previous Call Records ({data.calls.length})</summary>
        <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
          {data.calls.map(c=><div key={c.id} className="border-t border-slate-100 pt-2 text-slate-600">
            <p className="font-semibold">{OUTCOMES.find(x=>x[0]===c.outcome)?.[1]||c.outcome} · {new Date(c.created_at).toLocaleString('en-PH')}</p>
            <p>Recorded by Admin #{c.admin_id}</p>
            {c.admin_notes && <p className="mt-1 whitespace-pre-wrap">Internal notes: {c.admin_notes}</p>}
            {c.callback_at && <p>Callback: {new Date(c.callback_at).toLocaleString('en-PH')}</p>}
          </div>)}
        </div>
      </details>}
    </>}
 </section>;
}
