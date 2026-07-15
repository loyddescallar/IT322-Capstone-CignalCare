import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import customerApi from '../../api/customerApi';
import { useNavigate } from 'react-router-dom';

const TX_STATUSES=['completed','pending','failed','cancelled'];
const PAYMENT_METHODS=['GCash','Maya','Cash','Bank Transfer'];
function formatDate(d) { if(!d)return '—'; return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}); }

export default function AdminTransactions() {
  const navigate=useNavigate();
  const [transactions,setTx]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [statusF,setStatusF]=useState('All'); const [paymentF,setPayF]=useState('All');

  useEffect(()=>{
    async function load(){setLoading(true);try{const r=await axiosClient.get('/load/prepaid-transactions');setTx(r.data?.transactions||[]);}catch{try{const r=await axiosClient.get('/load/admin');setTx(r.data?.history||[]);}catch(e){console.error(e);}}finally{setLoading(false);}};load();
  },[]);

  const filtered=useMemo(()=>{ const q=search.toLowerCase(); return transactions.filter(t=>statusF==='All'||t.status===statusF).filter(t=>paymentF==='All'||t.payment_method===paymentF).filter(t=>(t.account_number||t.accountNumber||'').toLowerCase().includes(q)||(t.account_name||t.accountName||'').toLowerCase().includes(q)||(t.reference_no||'').toLowerCase().includes(q)||(t.plan_name||t.description||'').toLowerCase().includes(q)); },[transactions,search,statusF,paymentF]);

  const totalRevenue=transactions.reduce((s,t)=>s+Number(t.amount||t.loadAmount||0),0);
  const today=new Date().toISOString().split('T')[0];
  const todayRevenue=transactions.filter(t=>{const d=t.transaction_date||t.created_at||'';return d.startsWith(today)||d.includes(today);}).reduce((s,t)=>s+Number(t.amount||t.loadAmount||0),0);
  const pendingCount=transactions.filter(t=>t.status==='pending').length;
  const failedCount=transactions.filter(t=>['failed','cancelled'].includes(t.status)).length;

  const navigateToCustomer=async(accountNumber)=>{ if(!accountNumber)return; try{const r=await customerApi.getCustomerLookup(accountNumber); if(r.data?.user?.id)navigate('/admin/customers/'+r.data.user.id);}catch(e){console.error(e);} };

  const handleExport=()=>{
    const rows=[['ID','Reference No.','Account Name','Account No.','Plan','Amount','Payment Method','Processed By','Date','Expiry','Status']];
    filtered.forEach(t=>rows.push([t.id,t.reference_no||'',t.account_name||t.accountName||'',t.account_number||t.accountNumber||'',t.plan_name||t.description||'',t.amount||t.loadAmount||0,t.payment_method||'',t.processed_by||'Admin',formatDate(t.transaction_date||t.created_at),t.expiry_date?formatDate(t.expiry_date):'',t.status||'completed']));
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='transactions_'+today+'.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-lg font-bold text-gray-800">Transactions</h1><p className="text-xs text-gray-500 mt-0.5">Prepaid load transaction history</p></div><button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-xs px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold"><Download size={13}/> Export CSV</button></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[{label:'Total Revenue',value:'₱'+totalRevenue.toLocaleString(),color:'text-green-600'},{label:"Today's Revenue",value:'₱'+todayRevenue.toLocaleString(),color:'text-blue-600'},{label:'Pending',value:pendingCount,color:'text-amber-600'},{label:'Failed/Cancelled',value:failedCount,color:'text-red-600'}].map(s=><div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-2">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{loading?'...':s.value}</p></div>)}</div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs"><Search size={14} className="text-gray-400"/><input type="text" placeholder="Search account, reference, plan..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-full"/></div>
          <div className="flex items-center gap-2"><Filter size={13} className="text-gray-400"/>
            <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#cc0000] bg-white text-gray-600"><option value="All">All Status</option>{TX_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select>
            <select value={paymentF} onChange={e=>setPayF(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#cc0000] bg-white text-gray-600"><option value="All">All Payments</option>{PAYMENT_METHODS.map(p=><option key={p}>{p}</option>)}</select>
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead><tr className="border-b border-gray-100 bg-gray-50">{['#','Reference No.','Account Name','Account No.','Plan','Amount','Payment','Processed By','Date','Expiry','Status'].map(h=><th key={h} className="text-left py-2.5 px-3 text-gray-500 font-semibold uppercase tracking-wide" style={{fontSize:'10px'}}>{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={11} className="py-10 text-center text-gray-400">Loading transactions...</td></tr>
            :filtered.length===0?<tr><td colSpan={11} className="py-10 text-center text-gray-400">No transactions found.</td></tr>
            :filtered.map((t,i)=><tr key={t.id||i} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
              <td className="py-2 px-3 font-mono text-gray-400">{t.id}</td>
              <td className="py-2 px-3 font-mono text-gray-500" style={{fontSize:'10px'}}>{t.reference_no||'—'}</td>
              <td className="py-2 px-3"><button onClick={()=>navigateToCustomer(t.account_number||t.accountNumber)} className="font-semibold text-gray-800 hover:text-[#cc0000] hover:underline text-left">{t.account_name||t.accountName||'—'}</button></td>
              <td className="py-2 px-3 font-mono text-gray-600">{t.account_number||t.accountNumber||'—'}</td>
              <td className="py-2 px-3 text-gray-600">{t.plan_name||t.description||'—'}</td>
              <td className="py-2 px-3 font-bold text-[#cc0000]">₱{Number(t.amount||t.loadAmount||0).toLocaleString()}</td>
              <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.payment_method==='GCash'?'bg-blue-100 text-blue-700':t.payment_method==='Maya'?'bg-emerald-100 text-emerald-700':t.payment_method==='Cash'?'bg-gray-100 text-gray-700':'bg-purple-100 text-purple-700'}`}>{t.payment_method||'Cash'}</span></td>
              <td className="py-2 px-3 text-gray-500">{t.processed_by||'Admin'}</td>
              <td className="py-2 px-3 text-gray-400">{formatDate(t.transaction_date||t.created_at)}</td>
              <td className="py-2 px-3 text-gray-400">{t.expiry_date?formatDate(t.expiry_date):'—'}</td>
              <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.status==='completed'?'bg-green-100 text-green-700':t.status==='pending'?'bg-amber-100 text-amber-700':t.status==='failed'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{t.status||'completed'}</span></td>
            </tr>)}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
