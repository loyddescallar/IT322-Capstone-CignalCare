import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import incidentApi from '../api/incidentApi';
export default function ServiceAdvisoryBanner(){
 const [items,setItems]=useState([]); const [hidden,setHidden]=useState(new Set());
 useEffect(()=>{let a=true;incidentApi.getMyIncidents().then(r=>a&&setItems(r.data?.incidents||[])).catch(()=>{});return()=>{a=false}},[]);
 const visible=items.filter(i=>!hidden.has(i.id)); if(!visible.length)return null;
 return <div className="border-b border-amber-200 bg-amber-50"><div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6 lg:px-8">{visible.slice(0,2).map(i=><div key={i.id} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-3 sm:px-4"><AlertTriangle size={18} className="mt-0.5 text-amber-600"/><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase text-amber-700">Service Advisory · {i.location}</p><p className="mt-0.5 break-words text-sm font-bold text-slate-900">{i.issue_label}</p><p className="mt-1 text-xs text-slate-600">A common service issue has been confirmed in your area. You may still submit an individual concern if your situation is different.</p></div><button onClick={()=>setHidden(p=>new Set([...p,i.id]))} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100"><X size={15}/></button></div>)}</div></div>
}
