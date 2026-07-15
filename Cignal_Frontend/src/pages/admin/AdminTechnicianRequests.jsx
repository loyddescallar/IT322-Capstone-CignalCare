import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Wrench, Calendar, Phone, MapPin, Image } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import customerApi from '../../api/customerApi';

const STATUSES=['Submitted','Under Review','Scheduled','Completed','Cancelled'];
const LOCATIONS=['Balayan','Calaca','Lian','Calatagan','Nasugbu','Lemery'];
const sCfg={Submitted:{badge:'bg-red-100 text-red-700',dot:'bg-red-500'},'Under Review':{badge:'bg-amber-100 text-amber-700',dot:'bg-amber-400'},Scheduled:{badge:'bg-blue-100 text-blue-700',dot:'bg-blue-500'},Completed:{badge:'bg-green-100 text-green-700',dot:'bg-green-500'},Cancelled:{badge:'bg-slate-100 text-slate-600',dot:'bg-slate-400'}};

function sourceLabel(source) {
  if (source === 'load_request_signal_check') return 'Load Request Signal Check';
  return source || 'Manual Request';
}

export default function AdminTechnicianRequests() {
  const navigate=useNavigate();
  const [requests,setRequests]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [statusF,setStatusF]=useState('All'); const [locF,setLocF]=useState('All');
  const [selected,setSelected]=useState(null); const [techName,setTechName]=useState(''); const [adminNote,setAdminNote]=useState(''); const [newStatus,setNewStatus]=useState(''); const [saving,setSaving]=useState(false);
  const [photoModal,setPhotoModal]=useState(null);

  const load=async()=>{ setLoading(true); try{const r=await axiosClient.get('/technicians/requests/admin'); setRequests(r.data?.requests||[]);}catch(e){console.error(e);}finally{setLoading(false);} };
  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{ const q=search.toLowerCase(); return requests.filter(r=>statusF==='All'||r.status===statusF).filter(r=>locF==='All'||r.location===locF).filter(r=>[
    r.issueDescription,
    r.accountNumber,
    r.contactName,
    r.source,
    r.screen_issue,
  ].join(' ').toLowerCase().includes(q)); },[requests,search,statusF,locF]);
  const kpis=[{label:'Total',value:requests.length,dot:'bg-slate-400',color:'text-slate-800'},{label:'Submitted',value:requests.filter(r=>['Submitted','Pending'].includes(r.status)).length,dot:'bg-red-500',color:'text-red-600'},{label:'Under Review',value:requests.filter(r=>r.status==='Under Review').length,dot:'bg-amber-400',color:'text-amber-600'},{label:'Scheduled',value:requests.filter(r=>r.status==='Scheduled').length,dot:'bg-blue-500',color:'text-blue-600'},{label:'Completed',value:requests.filter(r=>r.status==='Completed').length,dot:'bg-green-500',color:'text-green-600'},{label:'From Load Check',value:requests.filter(r=>r.source==='load_request_signal_check').length,dot:'bg-red-500',color:'text-red-600'}];
  const openModal=r=>{setSelected(r);setNewStatus(r.status === 'Pending' ? 'Submitted' : r.status);setTechName(r.technician_name||'');setAdminNote(r.admin_note||'');};
  const handleSave=async()=>{ setSaving(true); try{await axiosClient.patch('/technicians/requests/admin/'+selected.id,{status:newStatus,technician_name:techName||null,admin_note:adminNote||null}); setRequests(prev=>prev.map(r=>r.id===selected.id?{...r,status:newStatus,technician_name:techName,admin_note:adminNote}:r)); setSelected(null);}catch(e){console.error(e);}finally{setSaving(false);} };
  const navigateToCustomer=async(accountNumber)=>{ try{const r=await customerApi.getCustomerLookup(accountNumber); if(r.data?.user?.id)navigate('/admin/customers/'+r.data.user.id);}catch(e){console.error(e);} };

  return (
    <div className="space-y-4">
      <div><h1 className="text-lg font-bold text-gray-800">Technician Requests</h1><p className="text-xs text-gray-500 mt-0.5">Field service and repair requests from subscribers</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{kpis.map(s=><div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-2 mb-2"><div className={`w-2 h-2 rounded-full ${s.dot}`}/><p className="text-xs text-gray-500">{s.label}</p></div><p className={`text-2xl font-bold ${s.color}`}>{loading?'...':s.value}</p></div>)}</div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs"><Search size={14} className="text-gray-400"/><input type="text" placeholder="Search issue, account, contact..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-full"/></div>
          <div className="flex gap-1.5 flex-wrap">{['All',...LOCATIONS].map(loc=><button key={loc} onClick={()=>setLocF(loc)} className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors ${locF===loc?'bg-[#cc0000] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{loc}</button>)}</div>
          <div className="flex gap-1.5 flex-wrap">{['All',...STATUSES].map(s=><button key={s} onClick={()=>setStatusF(s)} className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors ${statusF===s?'bg-slate-700 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>)}</div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} requests</span>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead><tr className="border-b border-gray-100 bg-gray-50">{['#','Issue','Source','Account No.','Contact','Location','Preferred Date','Photo','Technician','Status','Actions'].map(h=><th key={h} className="text-left py-2.5 px-3 text-gray-500 font-semibold uppercase tracking-wide" style={{fontSize:'10px'}}>{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={11} className="py-10 text-center text-gray-400">Loading...</td></tr>
            :filtered.length===0?<tr><td colSpan={11} className="py-10 text-center text-gray-400">No requests found.</td></tr>
            :filtered.map(r=>{const displayStatus=r.status==='Pending'?'Submitted':r.status; const s=sCfg[displayStatus]||sCfg.Submitted;return(
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                <td className="py-2 px-3 font-mono text-gray-400">{r.id}</td>
                <td className="py-2 px-3 font-semibold text-gray-800 max-w-[160px] truncate">{r.issueDescription}</td>
                <td className="py-2 px-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.source==='load_request_signal_check'?'bg-red-50 text-red-700':'bg-gray-100 text-gray-500'}`}>{sourceLabel(r.source)}</span>{r.screen_issue&&<p className="mt-1 text-[10px] text-gray-400">{r.screen_issue}</p>}</td>
                <td className="py-2 px-3"><button onClick={()=>navigateToCustomer(r.accountNumber)} className="font-mono text-gray-600 hover:text-[#cc0000] hover:underline">{r.accountNumber}</button></td>
                <td className="py-2 px-3 text-gray-600">{r.contactName}</td>
                <td className="py-2 px-3"><div className="flex items-center gap-1"><MapPin size={10} className="text-gray-400"/><span className="text-gray-500">{r.location||'—'}</span></div></td>
                <td className="py-2 px-3 text-gray-500">{r.preferred_date||'—'}</td>
                <td className="py-2 px-3">{r.screen_photo_url?<button onClick={()=>setPhotoModal({url:r.screen_photo_url,label:'TV Screen Photo'})} className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-100"><Image size={11}/>View</button>:<span className="text-gray-300">None</span>}</td>
                <td className="py-2 px-3 text-gray-500">{r.technician_name||<span className="text-gray-300">Unassigned</span>}</td>
                <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>{displayStatus}</span></td>
                <td className="py-2 px-3"><button onClick={()=>openModal(r)} className="text-xs px-3 py-1 bg-[#cc0000] text-white rounded-xl hover:bg-red-700 font-semibold">Manage</button></td>
              </tr>
            );})}
          </tbody>
        </table></div>
      </div>
      {selected&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-bold text-gray-800">Manage Request #{selected.id}</h2><button onClick={()=>setSelected(null)} className="p-1 rounded-xl hover:bg-gray-100 text-gray-400"><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-start gap-2"><Wrench size={12} className="text-[#cc0000] mt-0.5 flex-shrink-0"/><p className="text-xs text-gray-700 whitespace-pre-wrap">{selected.issueDescription}</p></div>
                <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400"/><p className="text-xs text-gray-600">{selected.contactName} · {selected.contactPhone}</p></div>
                {selected.location&&<div className="flex items-center gap-2"><MapPin size={12} className="text-gray-400"/><p className="text-xs text-gray-600">{selected.location}</p></div>}
                {selected.preferred_date&&<div className="flex items-center gap-2"><Calendar size={12} className="text-gray-400"/><p className="text-xs text-gray-600">{selected.preferred_date} {selected.preferred_time}</p></div>}
                {(selected.source||selected.screen_issue)&&<div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2"><p className="text-xs font-bold text-red-700">{sourceLabel(selected.source)}</p>{selected.screen_issue&&<p className="mt-1 text-xs text-red-600">TV issue: {selected.screen_issue}</p>}</div>}
                {selected.screen_photo_url&&<button onClick={()=>setPhotoModal({url:selected.screen_photo_url,label:'TV Screen Photo'})} className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-100"><Image size={12}/> View TV screen photo</button>}
              </div>
              <div><label className="block text-xs text-gray-500 font-medium mb-1" style={{fontSize:'10px'}}>Status</label><select value={newStatus} onChange={e=>setNewStatus(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000]">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500 font-medium mb-1" style={{fontSize:'10px'}}>Assign Technician</label><input value={techName} onChange={e=>setTechName(e.target.value)} placeholder="Enter technician name" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000]"/></div>
              <div><label className="block text-xs text-gray-500 font-medium mb-1" style={{fontSize:'10px'}}>Admin Note</label><textarea value={adminNote} onChange={e=>setAdminNote(e.target.value)} rows={3} placeholder="Optional notes..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000] resize-none"/></div>
              <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="flex-1 bg-[#cc0000] hover:bg-red-700 text-white text-xs py-2.5 rounded-xl font-semibold disabled:opacity-60">{saving?'Saving...':'Save Changes'}</button><button onClick={()=>setSelected(null)} className="flex-1 border border-gray-200 text-xs py-2.5 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
      {photoModal&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="text-sm font-bold text-gray-800">{photoModal.label}</h2><button onClick={()=>setPhotoModal(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"><X size={16}/></button></div>
            <div className="bg-gray-50 p-4"><img src={photoModal.url} alt={photoModal.label} className="mx-auto max-h-[70vh] rounded-xl object-contain"/></div>
          </div>
        </div>
      )}
    </div>
  );
}
