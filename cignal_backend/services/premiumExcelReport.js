'use strict';
// CignalCare+ premium Excel management snapshot. No SQL, payment writes or filesystem writes.
const ExcelJS = require('exceljs');
const zlib = require('node:zlib');
const { subscriberLifecycle } = require('../utils/subscriberLifecycle');

const RED = 'CC0000';
const DARK_RED = 'A90000';
const CHARCOAL = '252525';
const WHITE = 'FFFFFF';
const LIGHT = 'F6F6F6';
const LIGHT_RED = 'FFF0F0';
const GREY = '777777';
const BORDER = 'E5E5E5';
const LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery', 'Tuy'];
const MONEY = '"₱"#,##0.00;[Red]("₱"#,##0.00)';
const COUNT = '#,##0';

// Self-contained PNG chart renderer: snapshot charts without native/canvas/sharp dependencies.
// The XLSX also retains sortable tables and in-cell conditional data bars.
function makeTrendPng(trend = []) {
  const width = 920, height = 250;
  const pixels = Buffer.alloc(width * height * 4, 255);
  const colors = {
    red: [204, 0, 0], charcoal: [72, 72, 72], grid: [232, 232, 232],
    pale: [255, 242, 242], white: [255, 255, 255],
  };
  function rect(x,y,w,h,color) {
    const c=colors[color]||color;
    x=Math.max(0,Math.trunc(x));y=Math.max(0,Math.trunc(y));
    const endX=Math.min(width,x+Math.max(0,Math.trunc(w)));
    const endY=Math.min(height,y+Math.max(0,Math.trunc(h)));
    for(let yy=y;yy<endY;yy++)for(let xx=x;xx<endX;xx++){
      const p=(yy*width+xx)*4;pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];pixels[p+3]=255;
    }
  }
  rect(0,0,width,height,'white');
  rect(457,20,2,200,'grid');
  const recent=(Array.isArray(trend)?trend:[]).slice(-21);
  for(let pane=0;pane<2;pane++){
    const startX=pane===0?24:484, panelW=412;
    for(let j=0;j<=4;j++) rect(startX,30+j*48,panelW,1,'grid');
    const data=recent.map(x=>Math.max(0,num(pane===0?x.sales:x.support)));
    const top=Math.max(1,...data);
    const slot=panelW/Math.max(7,data.length);
    const barW=Math.max(5,Math.min(24,slot*0.65));
    data.forEach((value,i)=>{
      const barH=Math.max(0,Math.round(value/top*186));
      const x=startX+Math.round((i+.5)*slot-barW/2);
      rect(x,221-barH,barW,barH,pane===0?'red':'charcoal');
    });
    rect(startX,221,panelW,2,'charcoal');
  }
  const scanline=Buffer.alloc(height*(1+width*4));
  for(let y=0;y<height;y++){
    pixels.copy(scanline,y*(1+width*4)+1,y*width*4,(y+1)*width*4);
  }
  function crc32(data){
    let crc=-1;
    for(const b of data){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}
    return (crc^(-1))>>>0;
  }
  function chunk(type,body){
    const name=Buffer.from(type);const size=Buffer.alloc(4);size.writeUInt32BE(body.length);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([name,body])));
    return Buffer.concat([size,name,body,crc]);
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(scanline,{level:8})),chunk('IEND',Buffer.alloc(0)),
  ]);
}

function fill(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${argb}` } }; }
function text(value, max = 180) {
  const result = String(value == null ? '' : value).replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max);
  return /^[=+@\-]/.test(result) ? `'${result}` : result;
}
function num(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}
function labelLocation(value) {
  const raw = String(value || '').trim();
  if (/calaca/i.test(raw)) return 'Calaca';
  return LOCATIONS.find((item) => item.toLowerCase() === raw.toLowerCase()) || 'Other';
}
function activityCounts(users = []) {
  const byLocation = new Map(LOCATIONS.map((location) => [location, { location, active: 0, inactive: 0, atRisk: 0, noLoad: 0, archived: 0, total: 0 }]));
  for (const user of users) {
    const state = byLocation.get(labelLocation(user.location));
    if (!state) continue;
    state.total += 1;
    if (String(user.status || '').toLowerCase() === 'archived') { state.archived += 1; continue; }
    const classification = subscriberLifecycle(user.lastLoadDate);
    if (classification === 'Active') state.active += 1;
    else if (classification === 'Inactive') state.inactive += 1;
    else if (classification === 'At Risk') state.atRisk += 1;
    else state.noLoad += 1;
  }
  return [...byLocation.values()];
}
function scopeCounts(rows, location) {
  const filtered = !location ? rows : rows.filter((row) => row.location === labelLocation(location));
  return filtered.reduce((sum, row) => {
    for (const key of ['active', 'inactive', 'atRisk', 'noLoad', 'archived', 'total']) sum[key] += row[key];
    return sum;
  }, { active: 0, inactive: 0, atRisk: 0, noLoad: 0, archived: 0, total: 0 });
}
function setHeader(ws, title, kicker, subtitle) {
  ws.mergeCells('A1:L2');
  const main = ws.getCell('A1');
  main.value = title;
  main.font = { name: 'Aptos Display', bold: true, size: 21, color: { argb: `FF${WHITE}` } };
  main.alignment = { vertical: 'middle', indent: 1 };
  for (let r = 1; r <= 2; r++) { ws.getRow(r).height = 25; for (let c = 1; c <= 12; c++) ws.getCell(r,c).fill = fill(RED); }
  ws.mergeCells('A3:L3');
  ws.getCell('A3').value = kicker;
  ws.getCell('A3').font = { name: 'Aptos', size: 10, bold: true, color: { argb: `FF${WHITE}` } };
  ws.getCell('A3').alignment = { indent: 2, vertical: 'middle' };
  ws.getRow(3).height = 26;
  for (let c = 1; c <= 12; c++) ws.getCell(3,c).fill = fill(CHARCOAL);
  ws.mergeCells('A4:L4');
  ws.getCell('A4').value = subtitle;
  ws.getCell('A4').font = { name: 'Aptos', size: 10, color: { argb: `FF${GREY}` } };
  ws.getRow(4).height = 25;
  for (let c = 1; c <= 12; c++) ws.getCell(4,c).fill = fill(LIGHT);
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  for (let c = 1; c <= 12; c++) ws.getColumn(c).width = c === 1 ? 20 : 16;
  ws.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' };
}
function rowHeader(ws, row, start, end, title) {
  ws.mergeCells(row,start,row,end);
  const cell = ws.getCell(row,start);
  cell.value = title;
  cell.font = { name:'Aptos',bold:true,color:{argb:`FF${WHITE}`},size:11 };
  cell.alignment = { indent: 1, vertical: 'middle' };
  ws.getRow(row).height = 29;
  for(let c=start;c<=end;c++) ws.getCell(row,c).fill = fill(CHARCOAL);
}
function tableHeader(ws,row,labels,start=1){
  labels.forEach((name,i)=>{
    const c=ws.getCell(row,start+i);
    c.value=name;
    c.font={ name:'Aptos',size:10,bold:true,color:{argb:`FF${WHITE}`} };
    c.fill=fill(RED);
    c.alignment={ vertical:'middle',wrapText:true };
    c.border={ bottom:{style:'thin',color:{argb:`FF${DARK_RED}`}} };
  });
  ws.getRow(row).height=28;
}
function tableBody(ws,row,values,start=1){
  values.forEach((v,i)=>{
    const c=ws.getCell(row,start+i);
    c.value=(typeof v==='number' ? v : text(v));
    c.fill=fill(row % 2 ? WHITE : LIGHT);
    c.font={ name:'Aptos',size:10,color:{argb:`FF${CHARCOAL}`} };
    c.alignment={ vertical:'middle' };
    c.border={ bottom:{style:'hair',color:{argb:`FF${BORDER}`}} };
  });
  ws.getRow(row).height=23;
}
function dataBar(ws,range){
  ws.addConditionalFormatting({ ref:range, rules:[{
    type:'dataBar', priority:1, cfvo:[{type:'min'},{type:'max'}],
    color:{argb:`FF${RED}`}, showValue:true,
  }]});
}
function formulaCell(ws,coordinate,formula,result,format=COUNT){
  const c=ws.getCell(coordinate);
  c.value={ formula, result:num(result) };
  c.numFmt=format;
  c.font={ name:'Aptos Display',bold:true,size:21,color:{argb:`FF${CHARCOAL}`}};
  c.alignment={vertical:'middle'};
}
function card(ws,{col,row,label,value,note,format=COUNT,formula}){
  const a=col,b=col+2;
  for(let r=row;r<=row+3;r++)for(let c=a;c<=b;c++) ws.getCell(r,c).fill=fill(r===row?LIGHT_RED:WHITE);
  ws.mergeCells(row,a,row,b);
  ws.mergeCells(row+1,a,row+2,b);
  ws.mergeCells(row+3,a,row+3,b);
  const head=ws.getCell(row,a);
  head.value=label;
  head.font={name:'Aptos',bold:true,size:10,color:{argb:`FF${DARK_RED}`}};
  head.alignment={vertical:'middle',indent:1};
  const v=ws.getCell(row+1,a);
  v.value=formula?{formula,result:num(value)}:num(value);
  v.numFmt=format;
  v.font={name:'Aptos Display',bold:true,size:24,color:{argb:`FF${CHARCOAL}`}};
  v.alignment={vertical:'middle',indent:1};
  const foot=ws.getCell(row+3,a);
  foot.value=note;
  foot.font={name:'Aptos',size:9,color:{argb:`FF${GREY}`}};
  foot.alignment={vertical:'middle',indent:1};
  ws.getRow(row+1).height=21;ws.getRow(row+2).height=24;
}
function makeLink(ws,cell,label,anchor){
  const c=ws.getCell(cell);
  c.value={text:label,hyperlink:`#'${anchor}'!A1`,tooltip:`Open ${anchor}`};
  c.font={name:'Aptos',bold:true,size:10,color:{argb:`FF${WHITE}`},underline:true};
  c.fill=fill(CHARCOAL);
  c.alignment={vertical:'middle',horizontal:'center'};
}
function styleCurrency(ws,ranges){for(const r of ranges) ws.getCell(r).numFmt=MONEY;}
function addSheetTable(ws,headerRow,headers,rows,startCol=1){
  tableHeader(ws,headerRow,headers,startCol);
  rows.forEach((row,i)=>tableBody(ws,headerRow+1+i,row,startCol));
  return headerRow+rows.length;
}

async function buildPremiumExcelReport(payload, subscribers = [], createdAt = new Date()){
  const workbook=new ExcelJS.Workbook();
  workbook.creator='CignalCare+ / Descallar Satellite Services';
  workbook.title='CignalCare+ Premium Red & White Management Report';
  workbook.subject='Administrator business analytics snapshot';
  workbook.created=createdAt;
  workbook.calcProperties.fullCalcOnLoad=true;
  const selectedDays=String(payload?.filters?.days || '30');
  const selectedLocation=payload?.filters?.location || '';
  const k=payload?.kpis || {};
  const cohort=activityCounts(subscribers);
  const scoped=scopeCounts(cohort,selectedLocation);
  const home=workbook.addWorksheet('EXECUTIVE HOME',{properties:{tabColor:{argb:`FF${RED}`}}});
  const subs=workbook.addWorksheet('SUBSCRIBER INSIGHTS',{properties:{tabColor:{argb:`FF${RED}`}}});
  const sales=workbook.addWorksheet('REVENUE & SALES',{properties:{tabColor:{argb:`FF${CHARCOAL}`}}});
  const support=workbook.addWorksheet('SUPPORT PERFORMANCE',{properties:{tabColor:{argb:`FF${CHARCOAL}`}}});
  const notes=workbook.addWorksheet('REPORT NOTES',{properties:{tabColor:{argb:`FF${GREY}`}}});
  setHeader(home,'CIGNALCARE+  /  BUSINESS INTELLIGENCE','DESCALLAR SATELLITE SERVICES  •  MANAGEMENT DASHBOARD',`Report snapshot  •  Last ${selectedDays} days  •  ${selectedLocation || 'All Locations'}  •  Generated ${createdAt.toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}`);
  for(const ws of [subs,sales,support,notes]) setHeader(ws,`CIGNALCARE+  /  ${ws.name}`,'DESCALLAR SATELLITE SERVICES  •  MANAGEMENT REPORT',`Snapshot: Last ${selectedDays} days  •  ${selectedLocation || 'All Locations'}  •  Philippine time (GMT+8)`);
  home.getRow(6).height=30;
  [['A6','01 SUBSCRIBERS','SUBSCRIBER INSIGHTS'],['D6','02 REVENUE','REVENUE & SALES'],['G6','03 SUPPORT','SUPPORT PERFORMANCE'],['J6','04 REPORT NOTES','REPORT NOTES']].forEach(([cell,label,sheet])=>{
    const col=home.getCell(cell).col;home.mergeCells(6,col,6,col+2);makeLink(home,cell,label,sheet);
  });
  card(home,{col:1,row:9,label:'TOTAL COLLECTED SALES',value:k.totalRevenue,note:'Prepaid + collected services',format:MONEY});
  card(home,{col:4,row:9,label:'PREPAID REVENUE',value:k.prepaidRevenue,note:'Completed prepaid sales',format:MONEY});
  card(home,{col:7,row:9,label:'SERVICE REVENUE',value:k.serviceRevenue,note:'Collected service payments',format:MONEY});
  card(home,{col:10,row:9,label:'PREPAID GROSS PROFIT',value:k.grossProfit,note:'₱40 per completed prepaid load',format:MONEY});
  card(home,{col:1,row:15,label:'ACTIVE RELOAD ACTIVITY',value:scoped.active,note:'Last load within 0–59 days'});
  card(home,{col:4,row:15,label:'AT RISK  •  120+ DAYS',value:scoped.atRisk,note:'Equipment check before reload'});
  card(home,{col:7,row:15,label:'SUPPORT TICKETS',value:k.totalTickets,note:'Tickets in report period'});
  card(home,{col:10,row:15,label:'TICKET RESOLUTION RATE',value:num(k.resolutionRate)/100,note:'Resolved / support tickets',format:'0%'});
  rowHeader(home,21,1,6,'SALES BY LOCATION');
  rowHeader(home,21,8,12,'TOP REPORTED ISSUES');
  const locSales=(payload?.salesByLocation||[]).slice(0,7).map(x=>[text(x.location,60),num(x.revenue),num(x.count)]);
  addSheetTable(home,22,['LOCATION','COLLECTED SALES','TRANSACTIONS'],locSales,1);
  for(let j=0;j<locSales.length;j++)home.getCell(23+j,2).numFmt=MONEY;
  if(locSales.length) dataBar(home,`B23:B${22+locSales.length}`);
  const issues=(payload?.topIssues||[]).slice(0,7).map(x=>[text(x.label,80),num(x.count)]);
  addSheetTable(home,22,['REPORTED CONCERN','TICKETS'],issues,8);
  if(issues.length)dataBar(home,`I23:I${22+issues.length}`);
  rowHeader(home,34,1,12,'OPERATIONAL WATCHLIST  /  120-DAY SAFETY RULE');
  home.mergeCells('A35:L36');
  home.getCell('A35').value='At Risk = 120 days or more without a completed prepaid load. Check the receiver/modem, power, cables and signal before taking a new reload payment. Inactive = 60–119 days. Archiving is always a separate manual administrator action.';
  home.getCell('A35').font={name:'Aptos',size:11,color:{argb:`FF${DARK_RED}`},bold:true};
  home.getCell('A35').fill=fill(LIGHT_RED);
  home.getCell('A35').alignment={wrapText:true,vertical:'middle',indent:1};
  home.getRow(35).height=28;home.getRow(36).height=25;
  home.mergeCells('A38:L38');
  home.getCell('A38').value='REPORT IS A POINT-IN-TIME EXPORT. Use a fresh download for updated business activity. Detailed tables can be filtered/sorted inside Excel.';
  home.getCell('A38').font={name:'Aptos',size:10,color:{argb:`FF${GREY}`}};
  rowHeader(home,40,1,6,'COLLECTED SALES TREND');
  rowHeader(home,40,7,12,'SUPPORT TICKETS TREND');
  const trendImage = workbook.addImage({ buffer: makeTrendPng(payload?.trend || []), extension: 'png' });
  home.addImage(trendImage, { tl: { col: 0, row: 40 }, ext: { width: 850, height: 232 }, editAs: 'oneCell' });
  home.mergeCells('A55:L55');
  home.getCell('A55').value='CHARTS ARE POINT-IN-TIME VISUALS. Filter the sortable trend table on REVENUE & SALES for further inspection.';
  home.getCell('A55').font={name:'Aptos',size:10,color:{argb:`FF${GREY}`}};


  // Subscriber analytics are derived from the latest completed transaction for every account, not the report-period sales slice.
  subs.getCell('A6').value='Subscriber location lens:';subs.getCell('A6').font={bold:true,color:{argb:`FF${DARK_RED}`},name:'Aptos'};
  subs.getCell('B6').value=selectedLocation ? labelLocation(selectedLocation) : 'All Locations';
  subs.getCell('B6').fill=fill(LIGHT_RED);subs.getCell('B6').font={bold:true,color:{argb:`FF${DARK_RED}`}};
  subs.getCell('B6').dataValidation={type:'list',allowBlank:false,formulae:[`"All Locations,${LOCATIONS.join(',')}"`]};
  subs.mergeCells('D6:L7');subs.getCell('D6').value='Changing B6 recalculates the subscriber-status summary below. Revenue and support reflect the location and period chosen on the website at export time.';
  subs.getCell('D6').alignment={wrapText:true,vertical:'middle'};subs.getCell('D6').font={name:'Aptos',size:10,color:{argb:`FF${GREY}`}};
  rowHeader(subs,9,1,12,'ACTIVITY CLASSIFICATION  /  AS OF EXPORT DATE');
  tableHeader(subs,10,['CATEGORY','SUBSCRIBERS','RULE']);
  const statuses=[['Active','active','0–59 days since last completed reload'],['Inactive','inactive','60–119 days since last completed reload'],['At Risk','atRisk','120+ days — check receiver/modem before reloading'],['No Load Yet','noLoad','No completed prepaid reload on record'],['Archived','archived','Manually archived — separate from At Risk']];
  const lookup={active:'B',inactive:'C',atRisk:'D',noLoad:'E',archived:'F'};
  statuses.forEach(([label,key,explain],i)=>{
    const r=11+i;tableBody(subs,r,[label,0,explain]);
    const col=lookup[key];const all=`SUM(${col}22:${col}28)`;const one=`SUMIF($A$22:$A$28,$B$6,${col}22:${col}28)`;
    subs.getCell(`B${r}`).value={formula:`IF($B$6="All Locations",${all},${one})`,result:scoped[key]};
    subs.getCell(`B${r}`).numFmt=COUNT;
    subs.mergeCells(r,3,r,10);
  });
  rowHeader(subs,20,1,12,'LOCATION COMPARISON  /  EVERY REGISTERED SUBSCRIBER');
  tableHeader(subs,21,['LOCATION','ACTIVE','INACTIVE','AT RISK','NO LOAD','ARCHIVED','TOTAL']);
  cohort.forEach((row,i)=>tableBody(subs,22+i,[row.location,row.active,row.inactive,row.atRisk,row.noLoad,row.archived,row.total]));
  dataBar(subs,'D22:D28');subs.autoFilter='A21:G28';
  subs.mergeCells('A31:L33');subs.getCell('A31').value='IMPORTANT: A subscriber with 120+ days since the last completed load is At Risk, not automatically archived. Inspect equipment before reloading. The CignalCare+ transaction guard remains authoritative for payment and reload processing.';
  subs.getCell('A31').fill=fill(LIGHT_RED);subs.getCell('A31').font={name:'Aptos',bold:true,color:{argb:`FF${DARK_RED}`},size:11};subs.getCell('A31').alignment={vertical:'middle',wrapText:true,indent:1};

  rowHeader(sales,6,1,12,'COLLECTED REVENUE  /  SELECTED REPORT PERIOD');
  tableHeader(sales,7,['METRIC','AMOUNT / COUNT']);
  const fin=[['Collected Sales (PHP)',num(k.totalRevenue)],['Prepaid Sales (PHP)',num(k.prepaidRevenue)],['Service Sales (PHP)',num(k.serviceRevenue)],['Prepaid Gross Profit (PHP)',num(k.grossProfit)],['Completed Transactions',num(k.totalTransactions)],['POS Transactions',num(k.posTransactions)],['Online PayMongo Transactions',num(k.onlineTransactions)]];
  fin.forEach((r,i)=>{tableBody(sales,8+i,r);if(i<=3)sales.getCell(8+i,2).numFmt=MONEY;});
  rowHeader(sales,16,1,5,'SALES BY CHANNEL');rowHeader(sales,16,7,12,'SALES BY LOCATION');
  const ch=(payload?.salesByChannel||[]).map(x=>[x.channel,num(x.count),num(x.revenue)]);
  const selloc=(payload?.salesByLocation||[]).map(x=>[x.location,num(x.count),num(x.revenue)]);
  addSheetTable(sales,17,['CHANNEL','TRANSACTIONS','COLLECTED PHP'],ch,1);
  addSheetTable(sales,17,['LOCATION','TRANSACTIONS','COLLECTED PHP'],selloc,7);
  for(let i=0;i<ch.length;i++)sales.getCell(18+i,3).numFmt=MONEY;
  for(let i=0;i<selloc.length;i++)sales.getCell(18+i,9).numFmt=MONEY;
  if(ch.length)dataBar(sales,`C18:C${17+ch.length}`);
  if(selloc.length)dataBar(sales,`I18:I${17+selloc.length}`);
  const trendStart=Math.max(27,19+ch.length,19+selloc.length);
  rowHeader(sales,trendStart,1,12,'DAILY SALES & SUPPORT TREND  /  SORTABLE SOURCE');
  tableHeader(sales,trendStart+1,['DATE (MANILA)','COLLECTED SALES','SUPPORT TICKETS','RESOLVED']);
  const trend=(payload?.trend||[]);
  trend.forEach((p,i)=>{
    const row=trendStart+2+i;
    tableBody(sales,row,[p.date || p.label || '',num(p.sales),num(p.support),num(p.resolved)]);
    sales.getCell(row,2).numFmt=MONEY;
  });
  if(trend.length){sales.autoFilter=`A${trendStart+1}:D${trendStart+1+trend.length}`;dataBar(sales,`B${trendStart+2}:B${trendStart+1+trend.length}`);}
  sales.getColumn(1).width=27;sales.getColumn(3).width=24;sales.getColumn(7).width=24;

  rowHeader(support,6,1,12,'TICKET & SERVICE PERFORMANCE');
  tableHeader(support,7,['METRIC','VALUE']);
  const service=[['Support Tickets',num(k.totalTickets)],['Resolved Tickets',num(k.resolvedTickets)],['Resolution Rate (%)',num(k.resolutionRate)],['Technician Requests',num(payload?.technician?.total)],['Self-service Resolution (%)',num(k.selfServiceResolutionRate)],['Repeat Contact Rate (%)',num(k.repeatContactRate)],['Active Incidents',num(k.activeIncidents)],['Candidates for Review',num(k.incidentCandidates)]];
  service.forEach((r,i)=>tableBody(support,8+i,r));
  rowHeader(support,18,1,6,'TOP REPORTED ISSUES');rowHeader(support,18,8,12,'SUPPORT PER 100 ACCOUNTS');
  const issuesAll=(payload?.topIssues||[]).map(x=>[x.label,num(x.count)]);
  const supportLoc=(payload?.locations||[]).map(x=>[x.location,num(x.subscribers),num(x.support),num(x.supportPer100)]);
  addSheetTable(support,19,['ISSUE','TICKETS'],issuesAll,1);
  addSheetTable(support,19,['LOCATION','SUBSCRIBERS','TICKETS','PER 100'],supportLoc,8);
  if(issuesAll.length)dataBar(support,`B20:B${19+issuesAll.length}`);
  if(supportLoc.length)dataBar(support,`K20:K${19+supportLoc.length}`);
  rowHeader(support,32,1,12,'SELF-SERVICE TROUBLESHOOTING METHODS');
  const methods=(payload?.selfServiceMethods||[]).map(x=>[x.label,num(x.attempts),num(x.completed),num(x.resolved),num(x.successRate)]);
  addSheetTable(support,33,['METHOD','ATTEMPTS','COMPLETED','RESOLVED','SUCCESS RATE (%)'],methods,1);
  const funnel=payload?.supportFunnel||{};
  rowHeader(support,42,1,12,'SUPPORT FUNNEL');
  addSheetTable(support,43,['STAGE','SESSIONS'],[['Troubleshooting Sessions',num(funnel.sessions)],['Self-service Resolved',num(funnel.selfResolved)],['Ticket Escalations',num(funnel.ticketEscalations)],['Technician Escalations',num(funnel.technicianEscalations)]],1);
  support.getColumn(1).width=33;support.getColumn(8).width=24;

  rowHeader(notes,6,1,12,'REPORT SOURCE & INTERPRETATION');
  const info=[
    ['Source','CignalCare+ Administrator Analytics endpoint (admin authentication required)'],
    ['Generated',createdAt.toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' Manila time'],
    ['Report period',`${selectedDays} days, as requested on the website`],
    ['Report location',selectedLocation||'All Locations'],
    ['Subscriber lens','SUBSCRIBER INSIGHTS!B6 filters subscriber cohorts only'],
    ['Revenue', 'Completed prepaid loads + collected service payments; service revenue is not service profit'],
    ['Prepaid gross profit', 'Configured business metric of ₱40 per completed prepaid load'],
    ['At Risk', '120+ days since last completed reload; equipment check must precede new reload'],
    ['Inactive','60–119 days since last completed reload'],
    ['No Load Yet','No completed reload recorded; separately identified from At Risk'],
    ['Archived','Manual archive action; not the same as At Risk'],
    ['Snapshot','Export a fresh workbook to get current business data. No live database connection.'],
    ['Privacy','The workbook contains aggregate counts and business metrics, not subscriber PII.'],
    ['Sorting & filtering','Use AutoFilter arrows in the detailed report tables. No macro required.'],
  ];
  info.forEach(([name,meaning],i)=>{
    const row=8+i;
    notes.mergeCells(row,3,row,12);
    tableBody(notes,row,[name,'',meaning],1);
    notes.getCell(row,1).font={name:'Aptos',bold:true,color:{argb:`FF${DARK_RED}`}};
    notes.getCell(row,3).alignment={wrapText:true,vertical:'middle'};
    notes.getRow(row).height=i===5||i===11?37:29;
  });
  notes.getColumn(1).width=27;
  const output=await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
module.exports={buildPremiumExcelReport,activityCounts,scopeCounts};
