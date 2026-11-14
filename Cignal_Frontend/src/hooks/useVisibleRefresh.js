import { useEffect, useRef } from 'react';
// Repeats a lightweight data refresh while the page is visible; never overlaps callbacks.
// The callback should refetch records only and must not trigger side-effectful detection.
export default function useVisibleRefresh(refresh, intervalMs = 30000, enabled = true) {
  const latest=useRef(refresh);latest.current=refresh;
  useEffect(()=>{
    if(!enabled)return undefined;
    let active=true,inFlight=false,lastRunAt=0;
    const run=async()=>{
      if(!active || inFlight || document.visibilityState==='hidden')return;
      const now=Date.now();
      if(now-lastRunAt<1500)return; // visibilitychange and focus can fire together
      lastRunAt=now;inFlight=true;
      try{await latest.current();}catch(err){console.warn('VISIBLE REFRESH WARNING:',err?.message||err);}
      finally{inFlight=false;}
    };
    const onFocus=()=>{if(document.visibilityState==='visible')void run();};
    const timer=window.setInterval(()=>void run(),intervalMs);
    document.addEventListener('visibilitychange',onFocus);
    window.addEventListener('focus',onFocus);
    return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('focus',onFocus);};
  },[intervalMs,enabled]);
}
