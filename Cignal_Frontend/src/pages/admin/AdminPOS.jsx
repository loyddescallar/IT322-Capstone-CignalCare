import { useState, useEffect } from 'react';
import { CheckCircle2, X, Copy, Check } from 'lucide-react';
import customerApi from '../../api/customerApi';
import axiosClient from '../../api/axiosClient';

const PAYMENT_METHODS=['Cash','GCash','Maya','Bank Transfer'];
const GCASH_ACCOUNT={name:'Descallar Satellite Services',number:'09755718056'};
const MAYA_ACCOUNT={name:'Descallar Satellite Services',number:'09755718056'};

export default function AdminPOS() {
  const [customers,setCustomers]=useState([]); const [plans,setPlans]=useState([]); const [history,setHistory]=useState([]); const [loading,setLoading]=useState(true);
  const [txFilter,setTxFilter]=useState('All'); const [ccaQ,setCcaQ]=useState(''); const [found,setFound]=useState(null); const [notFound,setNotFound]=useState(false);
  const [plan,setPlan]=useState(null); const [payMethod,setPayMethod]=useState('Cash'); const [cashTendered,setCash]=useState('');
  const [processing,setProcessing]=useState(false); const [success,setSuccess]=useState(null); const [error,setError]=useState(''); const [qrModal,setQrModal]=useState(false); const [copied,setCopied]=useState('');

  useEffect(()=>{
    async function load(){setLoading(true);try{const[cr,pr,hr]=await Promise.all([customerApi.getCustomers(),axiosClient.get('/load/plans'),axiosClient.get('/load/admin')]);setCustomers(cr.data?.customers||[]);setPlans((pr.data?.plans||[]).filter(p=>p.status==='active'));setHistory(hr.data?.history||[]);}catch(e){console.error(e);}finally{setLoading(false);}};load();
  },[]);

  const today=new Date().toISOString().split('T')[0];
  const todayLoads=history.filter(h=>(h.created_at||'').startsWith(today));
  const totalRevenue=history.reduce((s,h)=>s+Number(h.loadAmount||0),0);
  const displayedHistory=txFilter==='Today'?todayLoads:history;

  const handleSearch=e=>{ e.preventDefault(); const q=ccaQ.trim(); if(!q)return; const f=customers.find(c=>c.accountNumber===q||c.ccaNumber===q); setFound(f||null);setNotFound(!f);setPlan(null);setSuccess(null);setError(''); };
  const copyText=(text,key)=>{ navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(''),2000);}); };
  const handleProcess=async()=>{
    if(!found||!plan||processing)return;
    if(payMethod==='Cash'&&(!cashTendered||Number(cashTendered)<Number(plan.amount))){setError('Enter a cash amount equal to or greater than the selected plan.');return;}
    setProcessing(true);setError('');setSuccess(null);
    try{await axiosClient.post('/load',{accountNumber:found.accountNumber,planId:plan.id,loadAmount:plan.amount,paymentMethod:payMethod,description:'POS Load — '+plan.plan_name+' via '+payMethod}); setSuccess({customer:found.accountName,plan:plan.plan_name,amount:plan.amount}); setFound(null);setPlan(null);setCcaQ('');setNotFound(false);setCash('');setQrModal(false); const hr=await axiosClient.get('/load/admin');setHistory(hr.data?.history||[]);}catch(e){console.error(e);setError(e.response?.data?.error||'Unable to process this load transaction.');}finally{setProcessing(false);}
  };

  const payAccount=payMethod==='GCash'?GCASH_ACCOUNT:MAYA_ACCOUNT;
  const change=cashTendered&&plan?Math.max(0,Number(cashTendered)-Number(plan.amount)):0;

  return (
    <div className="space-y-4">
      <div><h1 className="text-lg font-bold text-gray-800">POS / Prepaid</h1><p className="text-xs text-gray-500 mt-0.5">Process prepaid load transactions for subscribers</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{label:"Loads Today",value:loading?'...':todayLoads.length,color:'text-blue-600'},{label:'Total Transactions',value:loading?'...':history.length,color:'text-gray-800'},{label:'Total Revenue',value:loading?'...':'₱'+totalRevenue.toLocaleString(),color:'text-green-600'},{label:'Available Plans',value:loading?'...':plans.length,color:'text-[#cc0000]'}].map(s=><div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-2">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Load Terminal</h2>
          {error&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2"><X size={14} className="text-red-600 flex-shrink-0 mt-0.5"/><p className="text-xs font-semibold text-red-700">{error}</p></div>}
          {success&&<div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2"><CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5"/><div><p className="text-xs font-semibold text-green-700">Load Submitted!</p><p className="text-xs text-green-600 mt-0.5">{success.customer} — {success.plan} (₱{Number(success.amount).toLocaleString()})</p></div></div>}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2" style={{fontSize:'10px'}}>STEP 1 — FIND SUBSCRIBER</p>
            <form onSubmit={handleSearch} className="flex gap-2"><input type="text" value={ccaQ} onChange={e=>{setCcaQ(e.target.value);setNotFound(false);setFound(null);}} placeholder="Account No. or CCA No." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000]"/><button type="submit" className="bg-[#cc0000] text-white text-xs px-4 py-2 rounded-xl hover:bg-red-700 font-semibold">Search</button></form>
            {notFound&&<p className="text-xs text-red-600 mt-1.5">❌ No subscriber found for "{ccaQ}"</p>}
            {found&&<div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2"><p className="text-xs font-semibold text-green-700">✅ {found.accountName}</p><p className="text-xs text-green-600 font-mono">{found.accountNumber} · {found.location}</p></div>}
          </div>
          {found&&<div>
            <p className="text-xs font-semibold text-gray-500 mb-2" style={{fontSize:'10px'}}>STEP 2 — SELECT PLAN</p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
              {plans.length===0?<p className="text-xs text-gray-400 col-span-2 text-center py-4">No active plans.</p>:plans.map(p=><button key={p.id} onClick={()=>{setPlan(p);setError('');setSuccess(null);}} className={`text-left p-2.5 rounded-xl border transition-colors ${plan?.id===p.id?'border-[#cc0000] bg-red-50':'border-gray-200 hover:border-red-300'}`}><p className="text-xs font-bold text-gray-800">{p.plan_name}</p><p className="text-xs text-[#cc0000] font-semibold">₱{Number(p.amount).toLocaleString()}</p><p className="text-gray-400" style={{fontSize:'10px'}}>{p.validity_days} days · {p.hd_channels}HD/{p.sd_channels}SD</p></button>)}
            </div>
          </div>}
          {found&&plan&&<div>
            <p className="text-xs font-semibold text-gray-500 mb-2" style={{fontSize:'10px'}}>STEP 3 — PAYMENT METHOD</p>
            <div className="flex gap-2 flex-wrap">{PAYMENT_METHODS.map(m=><button key={m} onClick={()=>{setPayMethod(m);setCash('');setQrModal(false);setError('');}} className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-colors ${payMethod===m?'bg-[#cc0000] text-white border-[#cc0000]':'border-gray-200 text-gray-600 hover:border-red-300'}`}>{m}</button>)}</div>
            {payMethod==='Cash'&&<div className="mt-3"><label className="block text-xs text-gray-500 font-medium mb-1" style={{fontSize:'10px'}}>AMOUNT TENDERED</label><input type="number" value={cashTendered} onChange={e=>setCash(e.target.value)} placeholder={'₱'+Number(plan.amount).toLocaleString()} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000]"/>{cashTendered&&Number(cashTendered)>=Number(plan.amount)&&<p className="text-xs text-green-600 mt-1 font-semibold">Change: ₱{change.toLocaleString()}</p>}{cashTendered&&Number(cashTendered)<Number(plan.amount)&&<p className="text-xs text-red-600 mt-1">Short by ₱{(Number(plan.amount)-Number(cashTendered)).toLocaleString()}</p>}</div>}
            {(payMethod==='GCash'||payMethod==='Maya')&&<button onClick={()=>setQrModal(true)} className={`mt-3 w-full text-xs py-2 rounded-xl font-semibold text-white transition-colors ${payMethod==='GCash'?'bg-blue-600 hover:bg-blue-700':'bg-emerald-600 hover:bg-emerald-700'}`}>Show {payMethod} QR Code & Account Details</button>}
          </div>}
          {found&&plan&&<div className="border-t border-gray-100 pt-3 space-y-1.5">
            {[{label:'Subscriber',value:found.accountName},{label:'Plan',value:plan.plan_name},{label:'Amount',value:'₱'+Number(plan.amount).toLocaleString()},{label:'Payment',value:payMethod}].map(f=><div key={f.label} className="flex justify-between text-xs"><span className="text-gray-500">{f.label}</span><span className={`font-semibold ${f.label==='Amount'?'text-[#cc0000]':'text-gray-800'}`}>{f.value}</span></div>)}
            <button onClick={handleProcess} disabled={processing||(payMethod==='Cash'&&(!cashTendered||Number(cashTendered)<Number(plan.amount)))} className="w-full bg-[#cc0000] hover:bg-red-700 text-white text-xs py-3 rounded-xl font-bold mt-2 disabled:opacity-60">{processing?'Processing...':'✓ Process ₱'+Number(plan.amount).toLocaleString()+' Load'}</button>
          </div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2><div className="flex gap-1">{['Today','All'].map(f=><button key={f} onClick={()=>setTxFilter(f)} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${txFilter===f?'bg-[#cc0000] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>)}</div></div>
          <div className="divide-y divide-gray-50 max-h-[460px] overflow-y-auto">{loading?<div className="py-8 text-center text-xs text-gray-400">Loading...</div>:displayedHistory.length===0?<div className="py-8 text-center text-xs text-gray-400">No transactions.</div>:displayedHistory.slice(0,25).map((h,i)=><div key={i} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between"><div><p className="text-xs font-semibold text-gray-800">{h.accountNumber}</p><p className="text-xs text-gray-400 mt-0.5">{h.description||'Prepaid Load'}</p><p className="text-gray-400 mt-0.5" style={{fontSize:'10px'}}>{new Date(h.created_at).toLocaleDateString('en-PH')}</p></div><p className="text-sm font-bold text-[#cc0000]">₱{Number(h.loadAmount||0).toLocaleString()}</p></div>)}</div>
        </div>
      </div>
      {qrModal&&plan&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className={`px-5 py-4 flex items-center justify-between ${payMethod==='GCash'?'bg-blue-600':'bg-emerald-600'} text-white`}><h2 className="text-sm font-bold">{payMethod} Payment</h2><button onClick={()=>setQrModal(false)} className="p-1 rounded-xl hover:bg-white/20"><X size={16}/></button></div>
            <div className="p-5 space-y-4">
              <div className="flex justify-center"><div className="w-36 h-36 border-4 border-gray-800 rounded-xl p-2 bg-white"><div className="w-full h-full grid grid-cols-5 gap-0.5">{Array.from({length:25}).map((_,i)=><div key={i} className={`rounded-sm ${[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,13,11,17].includes(i)?'bg-gray-800':'bg-white'}`}/>)}</div></div></div>
              <p className="text-center text-xs text-gray-500">Scan using {payMethod} app</p>
              <div className={`rounded-xl p-4 space-y-3 ${payMethod==='GCash'?'bg-blue-50 border border-blue-100':'bg-emerald-50 border border-emerald-100'}`}>
                <div><p className="text-xs text-gray-500" style={{fontSize:'10px'}}>ACCOUNT NAME</p><p className="text-xs font-bold text-gray-800 mt-0.5">{payAccount.name}</p></div>
                <div className="flex items-center justify-between"><div><p className="text-xs text-gray-500" style={{fontSize:'10px'}}>{payMethod} NUMBER</p><p className="text-xs font-bold text-gray-800 mt-0.5 font-mono">{payAccount.number}</p></div><button onClick={()=>copyText(payAccount.number,'number')} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold text-white ${payMethod==='GCash'?'bg-blue-600':'bg-emerald-600'}`}>{copied==='number'?<Check size={12}/>:<Copy size={12}/>}{copied==='number'?'Copied!':'Copy'}</button></div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2"><div><p className="text-xs text-gray-500" style={{fontSize:'10px'}}>AMOUNT TO SEND</p><p className="text-lg font-bold text-[#cc0000]">₱{Number(plan.amount).toLocaleString()}</p></div><button onClick={()=>copyText(String(plan.amount),'amount')} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold text-white ${payMethod==='GCash'?'bg-blue-600':'bg-emerald-600'}`}>{copied==='amount'?<Check size={12}/>:<Copy size={12}/>}{copied==='amount'?'Copied!':'Copy'}</button></div>
              </div>
              <button onClick={()=>{setQrModal(false);handleProcess();}} className="w-full bg-[#cc0000] hover:bg-red-700 text-white text-xs py-2.5 rounded-xl font-bold">I've Paid — Process Load</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
