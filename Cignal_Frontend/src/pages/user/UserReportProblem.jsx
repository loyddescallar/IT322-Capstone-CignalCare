import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Flag, Image as ImageIcon, MessageSquareText, ShieldCheck, X, PhoneCall, Info } from 'lucide-react';
import UserPageShell from '../../components/UserPageShell';
import ticketApi from '../../api/ticketApi';
import { validateChatAttachment } from '../../utils/chatUtils';
import { REPORT_GROUPS, RECEIVER_MODELS, RECEIVER_CODES, CONTACT_METHODS,
  questionsFor, findGroupFromPrefill, findIssueFromPrefill, getGroup, getIssue } from '../../data/reportProblemCatalog';

const selectStyle='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#cc0000] focus:ring-4 focus:ring-red-100';
const inputStyle='w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#cc0000] focus:ring-4 focus:ring-red-100';
function storedUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}') || {}; }
  catch { return {}; }
}
export default function UserReportProblem() {
  const navigate=useNavigate();
  const location=useLocation();
  const prefill=location.state || {};
  const user=useMemo(storedUser,[]);
  const initialGroup=findGroupFromPrefill(prefill.prefillCategory,prefill.prefillSubject);
  const [groupId,setGroupId]=useState(initialGroup);
  const [issueCode,setIssueCode]=useState(()=>findIssueFromPrefill(initialGroup,prefill.prefillSubject));
  const [subject,setSubject]=useState(prefill.prefillSubject || getGroup(initialGroup).issues[0][1]);
  const [description,setDescription]=useState(prefill.prefillIssueDescription || prefill.prefillDescription || '');
  const [answers,setAnswers]=useState({});
  const [receiverModel,setReceiverModel]=useState('Not sure / I do not know');
  const [receiverCode,setReceiverCode]=useState('No code shown');
  const [contact,setContact]=useState({
    phone:user.phone || user.recovery_phone || '', alternativePhone:'', email:user.email || '',
    preferredMethod:'chat', smsOptIn:false,emailOptIn:false,
  });
  const [attachedPhoto,setAttachedPhoto]=useState(prefill.prefillScreenPhotoFile || null);
  const [createdTicketId,setCreatedTicketId]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const group=getGroup(groupId);
  const issue=getIssue(group,issueCode);
  const questions=questionsFor(groupId,issueCode);
  const needsReceiver=groupId==='receiver' || groupId==='remote' || groupId==='channels';
  const needsCode=issueCode==='receiver_error';

  const changeGroup=(value)=>{
    const next=getGroup(value);setGroupId(value);setIssueCode(next.issues[0][0]);
    setSubject(next.issues[0][1]);setAnswers({});
  };
  const changeIssue=(value)=>{
    const next=getIssue(group,value);setIssueCode(value);setSubject(next[1]);setAnswers({});
  };
  const updateContact=(key,value)=>setContact(p=>({...p,[key]:value}));
  const handleSubmit=async(event)=>{
    event.preventDefault();
    if(!subject.trim()) {setError('Subject is required.');return;}
    if(attachedPhoto) {const photoError=validateChatAttachment(attachedPhoto);if(photoError){setError(photoError);return;}}
    setLoading(true);setError('');
    let ticketId=createdTicketId;
    try {
      if(!ticketId){
        const result=await ticketApi.createTicket({
          category:group.legacyCategory, subject:subject.trim(),
          supportDetails:{
            group:groupId,issueCode,issueLabel:issue[1],diagnostics:answers,
            receiverModel:needsReceiver?receiverModel:'',receiverCode:needsCode?receiverCode:'',
            phone:contact.phone,alternativePhone:contact.alternativePhone,email:contact.email,
            preferredMethod:contact.preferredMethod,
            smsOptIn:contact.smsOptIn,emailOptIn:contact.emailOptIn,
          },
        });
        ticketId=result.data?.id;
        if(!ticketId) throw new Error('Ticket server returned no ID. Check My Tickets before trying again.');
        setCreatedTicketId(ticketId);
      }
      const diagnosis=Object.entries(answers).map(([key,value])=>{
        const question=questions.find(q=>q.id===key);
        return question?`${question.label}: ${value}`:'';
      }).filter(Boolean);
      const details=[
        `Specific Problem: ${issue[1]}`,
        needsReceiver?`Receiver Model: ${receiverModel}`:'',
        needsCode?`Receiver Error Code: ${receiverCode}`:'',
        ...diagnosis,
        description.trim()?`Subscriber Description:\n${description.trim()}`:'',
      ].filter(Boolean).join('\n');
      if(attachedPhoto){
        await ticketApi.sendTicketAttachment(ticketId,{file:attachedPhoto,message:details});
      }else if(details){
        await ticketApi.sendTicketMessage(ticketId,details);
      }
      navigate('/user/tickets');
    }catch(err){
      const detail=err.response?.data?.error || err.message || 'Unable to submit ticket.';
      setError(ticketId
        ? `Ticket #${ticketId} was created, but its description/photo was not confirmed: ${detail}. Retry details only; do not submit a second ticket.`
        : detail);
    }finally{setLoading(false);}
  };

  return <UserPageShell title="Report a Problem"
    description="Tell us what happened using the options relevant to your Cignal equipment and service."
    icon={Flag}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {prefill.prefillSubject && <div className="flex gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={17} className="shrink-0"/><p>Information from {prefill.source==='cignalbot'?'CignalBot':'Troubleshooting or Load Request'} is already included. Review it before submitting.</p>
        </div>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{createdTicketId && <button type="button" onClick={()=>navigate('/user/tickets')} className="mt-2 block font-semibold underline">View My Tickets</button>}
        </div>}
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <section className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">1. Identify the problem</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-xs font-bold uppercase text-slate-500">Main Category *</span>
                <select className={selectStyle} value={groupId} onChange={e=>changeGroup(e.target.value)} disabled={Boolean(createdTicketId)}>
                  {REPORT_GROUPS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </label>
              <label className="space-y-2"><span className="text-xs font-bold uppercase text-slate-500">Specific Problem *</span>
                <select className={selectStyle} value={issueCode} onChange={e=>changeIssue(e.target.value)} disabled={Boolean(createdTicketId)}>
                  {group.issues.map(([code,label])=><option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {questions.map(q=><label key={q.id} className="space-y-2"><span className="text-xs font-semibold text-slate-600">{q.label} (Optional)</span>
                <select className={selectStyle} value={answers[q.id]||''} onChange={e=>setAnswers(p=>({...p,[q.id]:e.target.value}))} disabled={Boolean(createdTicketId)}>
                  <option value="">Choose an answer</option>{q.options.map(v=><option key={v}>{v}</option>)}
                </select>
              </label>)}
              {needsReceiver && <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Cignal Receiver Model (Optional)</span>
                <select className={selectStyle} value={receiverModel} onChange={e=>setReceiverModel(e.target.value)} disabled={Boolean(createdTicketId)}>
                  {RECEIVER_MODELS.map(v=><option key={v}>{v}</option>)}
                </select>
              </label>}
              {needsCode && <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Error Code on Screen (Optional)</span>
                <select className={selectStyle} value={receiverCode} onChange={e=>setReceiverCode(e.target.value)} disabled={Boolean(createdTicketId)}>
                  {RECEIVER_CODES.map(v=><option key={v}>{v}</option>)}
                </select>
              </label>}
            </div>
          </section>
          <div className="border-t border-slate-100"/>
          <section className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">2. Explain the problem</h2>
            <label className="block space-y-2"><span className="text-xs font-bold uppercase text-slate-500">Subject *</span>
              <input value={subject} onChange={e=>setSubject(e.target.value)} required maxLength={160} className={inputStyle} placeholder="Brief summary" disabled={Boolean(createdTicketId)}/>
              <span className="block text-[11px] text-slate-400">Suggested from the specific problem, but editable.</span>
            </label>
            <label className="block space-y-2"><span className="text-xs font-bold uppercase text-slate-500">Your Description (Optional)</span>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} maxLength={4000} className={`${inputStyle} resize-y`} placeholder="What exactly happened? When did it start? What troubleshooting have you tried?"/>
            </label>
            <label className="block space-y-2"><span className="text-xs font-bold uppercase text-slate-500">Photo Evidence (Optional)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAttachedPhoto(e.target.files?.[0]||null)} className="block w-full text-xs text-slate-500"/>
              {attachedPhoto && <span className="flex items-center gap-2 text-xs text-blue-700"><ImageIcon size={14}/>{attachedPhoto.name||prefill.prefillScreenPhotoName||'Photo selected'}
                <button type="button" onClick={()=>setAttachedPhoto(null)} aria-label="Remove photo"><X size={14}/></button></span>}
            </label>
          </section>
          <div className="border-t border-slate-100"/>
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><PhoneCall size={17}/>3. Contact and follow-up preferences</h2>
            <p className="text-xs text-slate-500">This information is for this support ticket only and does not change your account profile. SMS/email alerts require an already verified destination.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Mobile Number (Optional)</span>
                <input className={inputStyle} type="tel" inputMode="tel" value={contact.phone} maxLength={32} onChange={e=>updateContact('phone',e.target.value)} placeholder="09XXXXXXXXX" disabled={Boolean(createdTicketId)}/>
              </label>
              <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Alternative Mobile Number (Optional)</span>
                <input className={inputStyle} type="tel" inputMode="tel" maxLength={32} value={contact.alternativePhone} onChange={e=>updateContact('alternativePhone',e.target.value)} placeholder="09XXXXXXXXX" disabled={Boolean(createdTicketId)}/>
              </label>
              <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Email Address (Optional)</span>
                <input className={inputStyle} type="email" maxLength={254} value={contact.email} onChange={e=>updateContact('email',e.target.value)} placeholder="name@email.com" disabled={Boolean(createdTicketId)}/>
              </label>
              <label className="space-y-2"><span className="text-xs font-semibold text-slate-600">Preferred Contact Method</span>
                <select className={selectStyle} value={contact.preferredMethod} onChange={e=>updateContact('preferredMethod',e.target.value)} disabled={Boolean(createdTicketId)}>
                  {CONTACT_METHODS.map(([v,label])=><option key={v} value={v}>{label}</option>)}
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={contact.smsOptIn} onChange={e=>updateContact('smsOptIn',e.target.checked)} disabled={Boolean(createdTicketId)} className="mt-0.5"/>
              I agree to receive essential ticket status and reply alerts by SMS at my verified mobile number.
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={contact.emailOptIn} onChange={e=>updateContact('emailOptIn',e.target.checked)} disabled={Boolean(createdTicketId)} className="mt-0.5"/>
              I agree to receive essential ticket status and reply alerts by email at my verified email address.
            </label>
            <p className="flex items-start gap-2 text-[11px] text-slate-500"><Info size={14} className="shrink-0"/>Your ticket still works when external alerts are unavailable. Support staff can use your provided number to contact you about the requested service.</p>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400">Your report will appear in My Tickets.</p>
            <button disabled={loading} type="submit" className="rounded-xl bg-[#cc0000] px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {loading?'Submitting...':createdTicketId?'Retry Saving Ticket Details':'Submit Support Ticket'}
            </button>
          </div>
        </form>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">What happens next</h2>
          <div className="mt-4 space-y-4">
            {[
              [MessageSquareText,'Ticket created','You can follow your concern in My Tickets.'],
              [Clock3,'Support review','The support team reviews your problem details.'],
              [PhoneCall,'Contact follow-up','An authorized staff member may contact you using your preferred method.'],
              [ShieldCheck,'Resolution update','Chat replies and status changes appear in the ticket conversation.'],
            ].map(([Icon,title,text])=><div key={title} className="flex gap-3"><Icon size={17} className="mt-0.5 shrink-0 text-slate-500"/><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div></div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800">
          For your safety, do not climb onto roofs or adjust the satellite dish yourself. Request professional assistance for equipment repairs.
        </div>
      </aside>
    </div>
  </UserPageShell>;
}
