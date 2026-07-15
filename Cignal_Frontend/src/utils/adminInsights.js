function displayTicketStatus(status) {
  const legacy = { Open: 'Submitted', 'In Progress': 'Under Review', Closed: 'Archived' };
  return legacy[status] || status || 'Submitted';
}

export function buildMonthlySeries(items, dateKey='created_at') {
  const now = new Date();
  const months = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    months.push({ key, label: d.toLocaleDateString('en-PH',{month:'short'}), value:0 });
  }
  items.forEach(item => {
    if (!item[dateKey]) return;
    const d = new Date(item[dateKey]);
    const k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const m = months.find(m=>m.key===k);
    if (m) m.value++;
  });
  return months;
}
export function summarizeTicketsByStatus(tickets) {
  return {
    Submitted: tickets.filter(t=>displayTicketStatus(t.status)==='Submitted').length,
    'Under Review': tickets.filter(t=>displayTicketStatus(t.status)==='Under Review').length,
    'Job Order Assigned': tickets.filter(t=>displayTicketStatus(t.status)==='Job Order Assigned').length,
    Resolved: tickets.filter(t=>displayTicketStatus(t.status)==='Resolved').length,
    Archived: tickets.filter(t=>displayTicketStatus(t.status)==='Archived').length,
  };
}
export function summarizeTicketsByCategory(tickets) {
  const counts = {};
  tickets.forEach(t=>{ counts[t.category]=(counts[t.category]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
}
export function buildDashboardInsights({tickets,customers,loads}) {
  const cats = summarizeTicketsByCategory(tickets);
  const topIssue = cats[0]?.label || 'No ticket trend yet. Start collecting support tickets.';
  const repeatedConcern = cats[1]?.label ? cats[1].label+' is a recurring concern.' : 'No repeated customer concern detected yet.';
  const totalRevenue = loads.reduce((s,l)=>s+Number(l?.loadAmount||0),0);
  const resolved = tickets.filter(t=>['Resolved','Archived'].includes(displayTicketStatus(t.status))).length;
  const resolutionRate = tickets.length ? Math.round((resolved/tickets.length)*100) : 0;
  const operationsSummary = 'You currently have '+customers.length+' customers, '+tickets.length+' tickets, and PHP '+totalRevenue.toFixed(2)+' total load value logged.';
  const atRisk = customers.filter(c=>{ if(!c.lastLoadDate)return false; const d=(Date.now()-new Date(c.lastLoadDate).getTime())/86400000; return d>30&&d<=60; }).length;
  const recommendation = atRisk>0 ? atRisk+' subscriber'+(atRisk>1?'s are':' is')+' at risk of lapsing. Send a reload reminder.' : 'Keep customer records updated so CCA inquiry and prepaid support stay accurate.';
  return { topIssue, repeatedConcern, resolutionRate, operationsSummary, recommendation };
}
