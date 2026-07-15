import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import axiosClient from '../../api/axiosClient';
import { fallbackPlanList, normalizePlan } from '../../utils/planHelpers';
import {
  CreditCardIcon, TvIcon, WifiIcon, StarIcon, FilmIcon,
  CpuChipIcon, PhoneIcon, BanknotesIcon, GlobeAltIcon,
  SparklesIcon, MapPinIcon,
} from '@heroicons/react/24/solid';
import { Bell, RefreshCw, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const PLAN_ICONS = [CreditCardIcon, StarIcon, StarIcon, TvIcon, FilmIcon, CreditCardIcon, WifiIcon];
const FALLBACK_LOAD_PLANS = fallbackPlanList().map((plan, index) => ({
  ...plan,
  label: plan.plan_name,
  details: plan.description,
  icon: PLAN_ICONS[index % PLAN_ICONS.length],
}));

const ABOUT_TILES = [
  { title:'Coverage',      text:'Nationwide service reaching all Filipino homes.',          icon:MapPinIcon },
  { title:'Entertainment', text:'A wide variety of channels for all ages.',                 icon:FilmIcon },
  { title:'Technology',    text:'Digital-quality signal built for modern viewing.',         icon:CpuChipIcon },
  { title:'Support',       text:'Responsive customer care assistance nationwide.',          icon:PhoneIcon },
];

const CHANNEL_CATEGORIES = ['All','Entertainment','Movies','News','Sports','Kids','Educational','Religious','Shopping','Radio','Others'];
const NOTIF_ICONS = { success:<CheckCircle2 size={14} className="text-green-500"/>, error:<AlertCircle size={14} className="text-red-500"/>, info:<Info size={14} className="text-blue-500"/> };

function useOutsideClick(ref, cb) {
  useEffect(()=>{ function h(e){if(ref.current&&!ref.current.contains(e.target))cb();} document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[ref,cb]);
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedPlan,  setSelectedPlan]  = useState(null);
  const [planList, setPlanList]          = useState(FALLBACK_LOAD_PLANS);
  const [activeCategory,setActiveCategory]= useState('All');
  const [prepaid,       setPrepaid]       = useState(null);
  const [notifications, setNotifs]        = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const notifRef = useRef(null);
  useOutsideClick(notifRef, ()=>setNotifOpen(false));

  // Fetch subscription status
  useEffect(()=>{
    axiosClient.get('/load/plans').then(r=>{
      const loaded=(r.data?.plans||[]).map(normalizePlan).filter(p=>p.status==='active').map((p,i)=>({
        ...p,
        label:p.plan_name,
        details:p.description,
        icon:PLAN_ICONS[i%PLAN_ICONS.length],
      }));
      setPlanList(loaded);
    }).catch(()=>setPlanList(FALLBACK_LOAD_PLANS));

    if(user.accountNumber){
      axiosClient.get('/customers/'+user.accountNumber).then(r=>{
        const c=r.data?.user;
        if(c?.lastLoadDate){
          const exp=new Date(c.lastLoadDate); exp.setDate(exp.getDate()+30);
          const daysLeft=Math.ceil((exp.getTime()-Date.now())/86400000);
          setPrepaid({ daysLeft, expiry:exp.toLocaleDateString('en-PH'), status:daysLeft>7?'active':daysLeft>0?'expiring':'expired' });
        }
      }).catch(()=>{});
    }
    axiosClient.get('/notifications').then(r=>setNotifs(r.data?.notifications||[])).catch(()=>{
      setNotifs([{id:1,type:'info',message:'Welcome to CignalCare+. Your account is active.',is_read:0,created_at:new Date().toISOString()}]);
    });
  },[]);

  // Scroll animations
  useEffect(()=>{
    const els=document.querySelectorAll('.fade-up,.slide-in-left,.slide-in-right,.stagger > *');
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show');});},{threshold:0.15});
    els.forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[planList.length]);

  const filteredChannels = selectedPlan && activeCategory!=='All'
    ? selectedPlan.channelData.filter(ch=>ch.category===activeCategory)
    : selectedPlan?.channelData||[];

  const unread = notifications.filter(n=>!n.is_read).length;
  const subBannerColor = prepaid?.status==='active'?'from-green-600 to-green-500':prepaid?.status==='expiring'?'from-amber-500 to-amber-400':'from-red-700 to-[#cc0000]';
  const subLabel = prepaid?.status==='active'?`✅ Active — ${prepaid.daysLeft} days remaining`:prepaid?.status==='expiring'?`⏰ Expiring — ${prepaid.daysLeft} days left`:'⚠️ Subscription Expired';

  return (
    <UserLayout>

      {/* Notification Bell */}
      <div ref={notifRef} className="fixed top-24 right-4 z-40">
        <button onClick={()=>setNotifOpen(!notifOpen)} className="relative bg-white shadow-lg border border-gray-200 p-3 rounded-full hover:bg-gray-50 transition-colors">
          <Bell size={20} className="text-gray-600"/>
          {unread>0&&<span className="absolute top-1 right-1 w-4 h-4 bg-cignalRed text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">{unread}</span>}
        </button>
        {notifOpen&&(
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Notifications</p>
              <button onClick={()=>{setNotifs(p=>p.map(n=>({...n,is_read:1})));axiosClient.patch('/notifications/read-all').catch(()=>{});}} className="text-xs text-cignalRed hover:underline font-semibold">Mark all read</button>
            </div>
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {notifications.length===0?<p className="text-xs text-gray-400 text-center py-6">No notifications.</p>
              :notifications.map(n=>(
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.is_read?'bg-blue-50/30':''}`}>
                  {NOTIF_ICONS[n.type]||NOTIF_ICONS.info}
                  <div className="flex-1 min-w-0"><p className="text-xs text-gray-700 leading-relaxed">{n.message}</p><p className="text-gray-400 mt-1" style={{fontSize:'10px'}}>{new Date(n.created_at).toLocaleDateString('en-PH')}</p></div>
                  {!n.is_read&&<div className="w-2 h-2 bg-cignalRed rounded-full flex-shrink-0 mt-1"/>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-screen bg-white flex flex-col">
        <main className="mx-auto w-full max-w-[1600px] space-y-16 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">

          {/* Subscription Status Banner */}
          {(prepaid||user.accountNumber)&&(
            <div className={`rounded-2xl bg-gradient-to-r ${prepaid?subBannerColor:'from-gray-500 to-gray-400'} text-white p-6 shadow-lg fade-up`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">Subscription Status</p>
                  <h2 className="text-2xl font-bold mt-1">{user.accountName||'Subscriber'}</h2>
                  <p className="text-white/80 text-sm mt-0.5">Account No: {user.accountNumber||'—'}</p>
                  {prepaid?<><p className="mt-2 font-semibold">{subLabel}</p><p className="text-white/70 text-sm">Expires: {prepaid.expiry}</p></> :<p className="mt-2 text-white/70 text-sm">No active subscription found.</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={()=>navigate('/user/load-request')} className="bg-white text-cignalRed font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm flex items-center gap-2"><RefreshCw size={16}/>{prepaid?.status==='expired'?'Load Again':'Reload Now'}</button>
                  <button onClick={()=>navigate('/user/load-history')} className="border-2 border-white text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm">Load History</button>
                </div>
              </div>
            </div>
          )}

          {/* HEADER */}
          <section className="fade-up">
            <h1 className="text-4xl font-bold text-cignalRed">Welcome to Descallar Satellite Services</h1>
            <p className="text-slate-600 max-w-xl mt-2">Manage your account, view load plans, and access Cignal Customer Care features designed for your convenience — all in one place.</p>
          </section>

          <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up"/>

          {/* VIDEO */}
          <section className="fade-up mt-10">
            <h2 className="text-2xl font-bold text-cignalRed mb-4">Cignal Prepaid Ultimate HD</h2>
            <div className="w-full rounded-2xl overflow-hidden shadow-xl bg-black hover:scale-[1.01] transition-transform duration-500">
              <video className="w-full h-auto" src="/video/user_background.mp4" autoPlay muted loop playsInline
                onError={e=>{e.target.style.display='none';}}/>
              <div className="hidden bg-gradient-to-r from-cignalRed to-[#880000] p-12 text-white text-center">
                <p className="text-2xl font-bold">Cignal Prepaid Ultimate HD</p>
                <p className="mt-2 text-white/80">Crystal clear signal. Non-stop entertainment.</p>
              </div>
            </div>
          </section>

          <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up mt-10"/>

          {/* LOAD PLANS */}
          <section className="fade-up">
            <h2 className="text-sm font-semibold tracking-[0.25em] text-cignalRed uppercase fade-up">Our Best Value Prepaid Load</h2>
            <p className="text-slate-600 mt-1 max-w-2xl fade-up">Click a load to see the channels included.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 stagger">
              {planList.map((plan,i)=>{
                const Icon=plan.icon || CreditCardIcon; const planData=plan;
                return(
                  <div key={plan.id || plan.plan_code || `${plan.amount}-${i}`} className="fade-up show" style={{animationDelay:`${i*0.12}s`}}
                    onClick={()=>{if(planData?.channelData?.length){setSelectedPlan(planData);setActiveCategory('All');}else{alert(`${plan.label} channel lineup not added yet.`);}}}>
                    <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-400 to-pink-500 p-[1px] shadow hover:shadow-lg hover:-translate-y-1 transition cursor-pointer">
                      <div className="rounded-[1.1rem] bg-white px-4 py-4 relative h-full flex flex-col justify-between">
                        <Icon className="absolute right-3 top-3 h-6 w-6 text-cignalRed floating-icon"/>
                        <div><p className="text-[10px] font-semibold text-cignalRed uppercase">{plan.label}</p><p className="text-2xl font-bold">₱{plan.amount}</p></div>
                        <p className="text-xs text-slate-600 mt-3">{plan.details}</p>
                        {planData?.channelData?.length>0&&<p className="mt-2 text-[11px] font-semibold text-cignalRed hover-tilt">View channels included →</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {planList.length===0&&(<div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><p className="text-sm font-semibold text-slate-700">No active prepaid plans are available.</p><p className="mt-1 text-xs text-slate-500">Please check again later or contact Descallar Satellite Services.</p></div>)}
            </div>
          </section>

          <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up"/>

          {/* ABOUT US */}
          <section className="w-full mt-10 space-y-10">
            <h2 className="text-center text-3xl font-bold text-cignalRed mb-4 fade-up">ABOUT US</h2>
            <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl slide-in-left">
              <img src="/images/Cignal-Web-About_Us-Banner.jpg" className="w-full h-auto object-cover"
                onError={e=>{e.target.style.display='none';}} alt="About Us"/>
              <div className="w-full bg-cignalRed py-3"><h3 className="text-center text-white font-bold text-lg">ABOUT US</h3></div>
            </div>
            <div className="mt-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-10 items-center">
              <div className="slide-in-left flex justify-center lg:justify-end">
                <img src="/images/CignalLogo1.png" className="h-32 sm:h-40 w-auto hover-tilt"
                  onError={e=>{e.target.style.display='none';}} alt="Cignal Logo"/>
              </div>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed slide-in-right">Launched in 2009, Cignal is the Philippines' premier DTH satellite provider using Broadcast Satellite Technology. We broadcast premium TV content nationwide.</p>
            </div>
          </section>

          <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up"/>

          {/* RED BANNER */}
          <section className="relative w-full rounded-2xl overflow-hidden shadow-lg fade-up hover-zoom">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500" style={{backgroundImage:"url('/images/Cignal23.jpg')",filter:"brightness(0.35)"}}/>
            <div className="relative z-10 text-center text-white py-20 space-y-6">
              <h2 className="text-lg sm:text-2xl font-semibold leading-relaxed max-w-4xl mx-auto fade-up">
                Cignal transmits 104 SD and 30 HD channels, including free-to-air and a varied mix of 17 audio channels. We also offer on-demand viewing via Pay-Per-View subscription offers, as well as online streaming via our Cignal Play website and app.
                <br/><br/>
                <span className="text-xl font-bold">In 2018, Cignal TV gained over 2,000,000 subscribers, making it the most subscribed Pay-TV provider in the Philippines!</span>
              </h2>
            </div>
          </section>

          {/* CIGNAL LOGO + PARAGRAPH */}
          <section className="mt-12 flex flex-col lg:flex-row items-start gap-8 fade-up">
            <img src="/images/CignalLogo1.png" alt="Cignal Logo" className="h-32 sm:h-40 w-auto hover-tilt" onError={e=>{e.target.style.display='none';}}/>
            <p className="text-slate-700 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto lg:mx-0">Cignal, a game changer in the Philippine media industry, is owned and operated by Cignal TV Inc., a subsidiary of MediaQuest Holdings. MediaQuest Holdings is the media arm of the PLDT Group of Companies.</p>
          </section>

          <div className="w-full h-[2px] bg-cignalRed opacity-60 fade-up"/>

          {/* ABOUT TILES */}
          <section className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
              {ABOUT_TILES.map((tile,i)=>{
                const Icon=tile.icon;
                return(
                  <div key={tile.title} className="fade-up" style={{animationDelay:`${i*0.15}s`}}>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition flex items-start gap-3">
                      <Icon className="h-7 w-7 text-cignalRed floating-icon"/>
                      <div><p className="text-xs font-semibold uppercase text-cignalRed tracking-wide">{tile.title}</p><p className="text-sm text-slate-700 mt-1">{tile.text}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* COMMITMENT BAND */}
          <section className="fade-up rounded-2xl bg-gradient-to-r from-cignalRed via-red-600 to-rose-500 text-white p-8 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-semibold text-center sm:text-left fade-up">Our Commitment to Better TV</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3 stagger">
              {[
                { icon:BanknotesIcon, title:'Affordable', text:'Flexible prepaid options for every budget.' },
                { icon:GlobeAltIcon,  title:'Accessible', text:'Available nationwide with multiple ways to load.' },
                { icon:SparklesIcon,  title:'Quality',    text:'Crystal-clear signal and reliable performance.' },
              ].map((c,i)=>{
                const Icon=c.icon;
                return(
                  <div key={c.title} className="fade-up" style={{animationDelay:`${i*0.15}s`}}>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20 flex gap-3">
                      <Icon className="h-8 w-8 floating-icon"/>
                      <div><p className="text-xs uppercase font-semibold text-red-100">{c.title}</p><p className="text-sm mt-1">{c.text}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* CHANNEL MODAL */}
      {selectedPlan&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white w-[94%] max-w-3xl p-6 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={()=>setSelectedPlan(null)} className="absolute right-4 top-4 text-gray-500 hover:text-black"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-cignalRed mb-1">{selectedPlan.name} — Included Channels</h2>
            <p className="text-sm text-slate-600 mb-4">Filter by category or explore the full channel lineup.</p>
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              {CHANNEL_CATEGORIES.map(cat=>(
                <button key={cat} onClick={()=>setActiveCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${activeCategory===cat?'bg-cignalRed text-white border-cignalRed shadow-sm':'bg-white text-cignalRed border-cignalRed/40 hover:bg-cignalRed/10'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1">
              {filteredChannels.map((ch,i)=>(
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:-translate-y-[3px] hover:shadow-lg transition">
                  <p className="text-sm font-bold">{ch.name}</p>
                  <p className="text-[11px] text-gray-600">{ch.category}</p>
                </div>
              ))}
              {filteredChannels.length===0&&<div className="col-span-full text-center text-sm text-gray-500 py-6">No channels found.</div>}
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
