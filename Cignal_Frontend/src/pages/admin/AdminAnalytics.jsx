import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, CreditCard, Ticket, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import ticketApi from '../../api/ticketApi';
import customerApi from '../../api/customerApi';
import axiosClient from '../../api/axiosClient';
import { buildDashboardInsights, buildMonthlySeries, summarizeTicketsByCategory, summarizeTicketsByStatus } from '../../utils/adminInsights';

const STATUS_BAR={Submitted:'bg-red-500','Under Review':'bg-amber-400','Job Order Assigned':'bg-blue-500',Resolved:'bg-green-500',Archived:'bg-slate-400'};
const STATUS_BADGE={Submitted:'bg-red-100 text-red-700','Under Review':'bg-amber-100 text-amber-700','Job Order Assigned':'bg-blue-100 text-blue-700',Resolved:'bg-green-100 text-green-700',Archived:'bg-slate-100 text-slate-600'};

function getLast6Months() { const months=[]; const now=new Date(); for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),label:d.toLocaleDateString('en-PH',{month:'short',year:'2-digit'})});} return months; }

export default function AdminAnalytics() {
  const [tickets,setTickets]=useState([]); const [customers,setCustomers]=useState([]); const [loads,setLoads]=useState([]); const [plans,setPlans]=useState([]); const [loading,setLoading]=useState(true); const [selectedMonth,setMonth]=useState(null);
  const MONTHS=getLast6Months();

  useEffect(()=>{
    let active=true; async function load(){setLoading(true);try{const[tr,cr,lr,pr]=await Promise.all([ticketApi.getAdminTickets(),customerApi.getCustomers(),axiosClient.get('/load/admin'),axiosClient.get('/load/plans').catch(()=>({data:{plans:[]}}))]);if(!active)return;setTickets(tr.data?.tickets||[]);setCustomers(cr.data?.customers||[]);setLoads(lr.data?.history||[]);setPlans(pr.data?.plans||[]);}catch(e){console.error(e);}finally{if(active)setLoading(false);}} load(); return()=>{active=false;};
  },[]);

  function getMonthKey(d){if(!d)return null;const dt=new Date(d);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}
  const filteredLoads=useMemo(()=>selectedMonth?loads.filter(l=>getMonthKey(l.created_at)===selectedMonth):loads,[loads,selectedMonth]);
  const filteredTickets=useMemo(()=>selectedMonth?tickets.filter(t=>getMonthKey(t.created_at)===selectedMonth):tickets,[tickets,selectedMonth]);
  const filteredCustomers=useMemo(()=>selectedMonth?customers.filter(c=>getMonthKey(c.created_at)===selectedMonth):customers,[customers,selectedMonth]);

  const statusCounts=useMemo(()=>summarizeTicketsByStatus(filteredTickets),[filteredTickets]);
  const categoryCounts=useMemo(()=>summarizeTicketsByCategory(filteredTickets),[filteredTickets]);
  const growth=useMemo(()=>buildMonthlySeries(customers),[customers]);
  const loadGrowth=useMemo(()=>buildMonthlySeries(loads),[loads]);
  const insights=useMemo(()=>buildDashboardInsights({tickets,customers,loads}),[tickets,customers,loads]);
  const totalRevenue=filteredLoads.reduce((s,l)=>s+Number(l?.loadAmount||0),0);
  const resolvedRate=filteredTickets.length?Math.round((filteredTickets.filter(t=>['Resolved','Archived'].includes(t.status)).length/filteredTickets.length)*100):0;

  const locationMap=useMemo(()=>{const m={};customers.forEach(c=>{m[c.accountNumber]=c.location||'Unknown';});return m;},[customers]);
  const revenueByLocation=useMemo(()=>{const rev={};filteredLoads.forEach(l=>{const loc=locationMap[l.accountNumber]||'Unknown';rev[loc]=(rev[loc]||0)+Number(l.loadAmount||0);});return Object.entries(rev).sort((a,b)=>b[1]-a[1]);},[filteredLoads,locationMap]);

  const statusBarData=Object.entries(statusCounts).map(([name,count])=>({name,count}));
  const growthData=growth.map(m=>({month:m.label,value:m.value}));
  const loadGrowthData=loadGrowth.map(m=>({month:m.label,value:m.value}));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="text-lg font-bold text-gray-800">Analytics</h1><p className="text-xs text-gray-500 mt-0.5">System performance and subscriber insights</p></div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={()=>setMonth(null)} className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${selectedMonth===null?'bg-[#cc0000] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>● All Time</button>
          {MONTHS.map(m=><button key={m.key} onClick={()=>setMonth(m.key)} className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${selectedMonth===m.key?'bg-[#cc0000] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m.label}</button>)}
        </div>
      </div>
      {selectedMonth&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2"><p className="text-xs text-amber-700 font-semibold">Showing data for {MONTHS.find(m=>m.key===selectedMonth)?.label} — {filteredLoads.length} transactions, {filteredTickets.length} tickets, {filteredCustomers.length} new customers</p></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{label:'Total Revenue',value:'₱'+totalRevenue.toLocaleString(),color:'text-green-600',icon:<CreditCard size={15} className="text-green-500"/>},{label:'Total Customers',value:filteredCustomers.length,color:'text-blue-600',icon:<Users size={15} className="text-blue-500"/>},{label:'Total Tickets',value:filteredTickets.length,color:'text-[#cc0000]',icon:<Ticket size={15} className="text-[#cc0000]"/>},{label:'Resolution Rate',value:resolvedRate+'%',color:'text-amber-600',icon:<TrendingUp size={15} className="text-amber-500"/>}].map(s=><div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-2 mb-2">{s.icon}<p className="text-xs text-gray-500">{s.label}</p></div><p className={`text-2xl font-bold ${s.color}`}>{loading?'...':s.value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ticket Status Distribution</h2>
          <div className="space-y-3">{Object.entries(statusCounts).map(([label,value])=>{const total=Math.max(Object.values(statusCounts).reduce((s,v)=>s+v,0),1);return(<div key={label}><div className="flex justify-between text-xs mb-1"><span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[label]||'bg-gray-100 text-gray-600'}`}>{label}</span><span className="text-gray-500 font-semibold">{value} ({Math.round((value/total)*100)}%)</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${STATUS_BAR[label]||'bg-gray-400'}`} style={{width:Math.max((value/total)*100,value?4:0)+'%'}}/></div></div>);})}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Ticket Categories</h2>
          {categoryCounts.length===0?<div className="py-6 text-center text-xs text-gray-400">No tickets yet.</div>:<div className="space-y-2">{categoryCounts.slice(0,5).map((c,i)=><div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-red-100 text-[#cc0000] flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span><p className="text-xs text-gray-700">{c.label}</p></div><span className="text-xs font-bold text-gray-800">{c.value}</span></div>)}</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer Growth (6 months)</h2>
          <ResponsiveContainer width="100%" height={160}><BarChart data={growthData}><XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={25}/><Tooltip contentStyle={{fontSize:10,borderRadius:8,border:'1px solid #e5e7eb'}}/><Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Load Activity (6 months)</h2>
          <ResponsiveContainer width="100%" height={160}><BarChart data={loadGrowthData}><XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} width={25}/><Tooltip contentStyle={{fontSize:10,borderRadius:8,border:'1px solid #e5e7eb'}}/><Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Location</h2>
          {revenueByLocation.length===0?<div className="py-6 text-center text-xs text-gray-400">No transaction data yet.</div>:<div className="space-y-2">{revenueByLocation.map(([loc,rev])=>{ const max=Math.max(...revenueByLocation.map(([,r])=>r),1); return(<div key={loc}><div className="flex justify-between text-xs mb-1"><span className="text-gray-600 font-medium">{loc}</span><span className="text-gray-500 font-semibold">₱{rev.toLocaleString()}</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-purple-500" style={{width:Math.max((rev/max)*100,4)+'%'}}/></div></div>); })}</div>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Available Plans</h2>
          {plans.length===0?<div className="py-6 text-center text-xs text-gray-400">No plans data.</div>:<div className="space-y-2">{plans.filter(p=>p.status==='active').map(p=><div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/><p className="text-xs font-semibold text-gray-800">{p.plan_name}</p></div><div className="text-right"><p className="text-xs font-bold text-[#cc0000]">₱{Number(p.amount).toLocaleString()}</p><p className="text-gray-400" style={{fontSize:'10px'}}>{p.hd_channels}HD · {p.sd_channels}SD</p></div></div>)}</div>}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3"><Lightbulb size={14} className="text-[#cc0000]"/><h2 className="text-sm font-semibold text-gray-700">Smart Operations Summary</h2><span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Rule-based</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{[{label:'Top Issue',value:insights.topIssue},{label:'Recurring Concern',value:insights.repeatedConcern},{label:'Operations Summary',value:insights.operationsSummary}].map(f=><div key={f.label} className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 font-semibold uppercase" style={{fontSize:'10px'}}>{f.label}</p><p className="text-xs text-gray-800 leading-relaxed mt-1">{f.value}</p></div>)}</div>
        <div className="mt-3 bg-[#cc0000] rounded-xl p-4 text-white"><p className="font-semibold uppercase opacity-80" style={{fontSize:'10px'}}>Recommendation</p><p className="text-xs leading-relaxed mt-1">{insights.recommendation}</p></div>
      </div>
    </div>
  );
}
