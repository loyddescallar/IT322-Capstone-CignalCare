import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, RotateCcw, ChevronDown } from 'lucide-react';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Magandang umaga";
  if (hour < 18) return "Magandang hapon";
  return "Magandang gabi";
};

const RULES = [
  { patterns:['status', 'track', 'ticket status', 'ano na balita'],
    response:'**Check Ticket Status**\n\nI-enter ang iyong Ticket ID para makita ang status ng iyong request:',
    actions:[{label:'🎫 I-check Status', path:'/user/tickets', color:'blue'}] },
  { patterns:['hello','hi','hey','good morning','good afternoon','good evening','kumusta','magandang'],
    response:`${getGreeting()}! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?`,
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['salamat','thank you','thanks','maraming salamat'],
    response:'Walang anuman! 😊 Kung may iba pa kang katanungan, nandito lang ako.\n\nMaganda ang araw sayo!',
    quickReplies:['Back to menu'] },
  { patterns:['e1','error 1','e-1','no satellite signal'],
    response:'**Error E1 — No Satellite Signal**\n\nMga dapat gawin:\n→ Suriin ang satellite cable sa likod ng box\n→ Tingnan kung nakakonekta ang cable sa LNB ng dish\n→ I-restart ang box (cabutan ng 10 segundo)\n→ Check kung may bagyo o malakas na ulan',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['e2','error 2','e-2'],
    response:'**Error E2 — No Signal from Dish**\n\n→ I-check ang cable connections sa box at dish\n→ Linisin ang LNB connector ng cable\n→ Palitan ang cable kung may sira\n→ Subukang mag-channel scan',
    quickReplies:['Request Technician'] },
  { patterns:['e3','error 3','e-3','weak signal','mahina ang signal'],
    response:'**Error E3 — Weak Signal**\n\nAng signal level ay mababa. Karaniwan itong dahil sa:\n→ Maulap o maulan na panahon (normal ito)\n→ Harang sa dish (puno, gusali)\n→ LNB problem\n\nHintayin matapos ang ulan at subukan ulit.',
    quickReplies:['Still not working'] },
  { patterns:['e4','error 4','e-4','smartcard','smart card'],
    response:'**Error E4 — Smartcard Error**\n\n→ Alisin ang smartcard sa slot\n→ Linisin gamit ang tuyong tela\n→ Ibalik ng tama (golden chip pababa)\n→ Hintayin ng 1 minuto',
    actions:[{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['e5','error 5','e-5','please subscribe','wala nang channel','expired'],
    response:'**Error E5 — Please Subscribe**\n\nAng iyong subscription ay nag-expire na.\n\nMag-reload ng prepaid load para mabawi ang iyong channels:',
    actions:[{label:'📱 Remote Load Request',path:'/user/load-request',color:'emerald'},{label:'📜 View Load History',path:'/user/load-history',color:'slate'}] },
  { patterns:['no signal','walang signal','wala signal','blank','blangko','black screen','walang picture','no picture'],
    response:'**Walang Signal / No Signal**\n\nGawin ito step by step:\n→ I-check ang HDMI/AV input ng TV\n→ Suriin ang cable sa likod ng Cignal box\n→ I-restart ang box (cabutan ng power 10 segundo)\n→ Kung may bagyo, hintayin matapos ang ulan',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['frozen','freeze','naka-freeze','pixelated','blocking','blocky'],
    response:'**Frozen / Pixelated Screen**\n\nIto ay karaniwang dahil sa mahinang signal:\n→ Hintayin ang ulan o bagyo\n→ Subukan ang channel scan (Settings > Channel Scan)\n→ I-restart ang Cignal box',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'}] },
  { patterns:['no sound','walang tunog','no audio','walang audio','muted'],
    response:'**Walang Tunog / No Audio**\n\n→ Siguraduhing hindi naka-mute ang TV\n→ I-check ang audio settings ng Cignal box\n→ Subukan ang ibang channel\n→ I-restart ang box',
    actions:[{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['remote','rimokon','hindi gumagana remote','remote not working'],
    response:'**Remote Control Problem**\n\n→ Palitan ang baterya (2×AA batteries)\n→ Siguraduhing walang harang sa IR sensor ng box\n→ Subukang i-point nang direkta sa box\n→ I-reset ang box gamit ang power button sa unit mismo' },
  { patterns:['restart','i-restart','reboot','on off','pag-off'],
    response:'**Paano I-restart ang Cignal Box:**\n\n→ Pindutin ang power button sa box OR\n→ Cabutan ang kuryente ng 10-15 segundo\n→ Hintayin ng 1-2 minuto para mag-boot' },
  { patterns:['load','reload','prepaid','bayad','mag-load','how to load','paano mag-load','gcash','maya','payment'],
    response:'**Prepaid Load Plans:**\n\n| Plan | Price | Validity |\n|------|-------|----------|\n| Load 200 | ₱200 | 30 days |\n| Load 300 | ₱300 | 30 days |\n| Load 500 | ₱500 | 30 days |\n\nMaaari kang mag-request ng **Remote Load** — mag-bayad via GCash/Maya at i-submit ang resibo:',
    actions:[{label:'📱 Request Remote Load',path:'/user/load-request',color:'emerald'}] },
  { patterns:['channel','channels','wala','missing channel','nawala','channel scan'],
    response:'**Nawala ang Channel / Missing Channels**\n\n→ Gawin ang **Channel Scan** (Settings > Channel Scan)\n→ Siguraduhing active ang iyong subscription\n→ Kung expired, kailangan mag-reload',
    quickReplies:['Do Channel Scan','Check Subscription','File a Ticket'] },
  { patterns:['channel scan','how to scan','paano mag-scan'],
    response:'**Paano Gumawa ng Channel Scan:**\n\n1. Pindutin ang **MENU** button sa remote\n2. Pumunta sa **Setup** o **Settings**\n3. Piliin ang **Satellite/Channel Search**\n4. Piliin ang **Auto Scan** o **Full Scan**\n5. Hintayin na matapos ang scan (5-10 minuto)\n6. I-save ang mga channel' },
  { patterns:['dish','antenna','satellite dish','i-align','alignment'],
    response:'**Dish Alignment Problem**\n\nAng dish alignment ay kailangang gawin ng technician. Huwag subukang i-adjust ang dish nang walang proper equipment.',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['box','cignal box','decoder','receiver','wont turn on','hindi nag-o-on'],
    response:'**Cignal Box Problem**\n\n→ I-check kung nakakonekta ang power cable\n→ Subukang ibang power outlet\n→ Check ang indicator light sa box',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'},{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['subscription','account','account number','cca','retrieve','info'],
    response:'**Account Information**\n\nMaari mong i-check ang iyong account details gamit ang CCA Inquiry:',
    actions:[{label:'👤 CCA / Account Inquiry',path:'/user/retrieve-info',color:'blue'}] },
  { patterns:['ticket','report','problema','issue','concern','file'],
    response:'**Mag-file ng Support Ticket**\n\nPara sa mga isyu na kailangan ng mas malalim na atensyon, mag-file ng support ticket:',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🎫 My Tickets',path:'/user/tickets',color:'slate'}] },
  { patterns:['technician','tech','repair','ayusin','sira','visit'],
    response:'**Request Technician Visit**\n\nMag-request ng on-site technician para sa mga pisikal na problema (dish alignment, cable replacement, box repair):',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['rain','ulan','storm','bagyo','weather','signal loss during rain'],
    response:'**Signal Loss During Rain/Storm**\n\nIto ay **normal** para sa satellite TV. Tinatawag itong "rain fade."\n\n→ Hintayin na tumigil ang ulan o bagyo\n→ Karaniwang bumabalik ang signal pagkatapos ng 5-30 minuto',
    quickReplies:['Still no signal after rain'] },
  { patterns:['coverage','balayan','calaca','lian','calatagan','nasugbu','lemery','area','covered'],
    response:'**Coverage Areas:**\n\nSiniserbisyuhan ng Descallar Satellite Services ang mga sumusunod:\n• Balayan, Calaca, Lian, Calatagan, Nasugbu, Lemery\n\nPara sa inquiries, tumawag sa **0975-571-8056** o **0917-511-9647**' },
  { patterns:['contact','phone','number','address','location','office'],
    response:'**Contact Information:**\n\n📍 Langgangan, Balayan, Batangas\n📞 0975-571-8056\n📞 0917-511-9647\n\n*Service hours: Monday to Saturday, 8:00 AM - 5:00 PM*' },
  { patterns:['what can you do','ano ang kaya mo','help','tulong','ano maari','capabilities'],
    response:'**Kaya Kong Gawin para sa Iyo:**\n\n→ Tulungan sa signal at technical issues\n→ I-explain ang error codes\n→ Gabayan sa troubleshooting\n→ I-assist sa load inquiries\n→ I-direct sa pagfile ng ticket o tech request',
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['bye','goodbye','paalam','ingat'],
    response:'Paalam! 👋 Sana naayos ang iyong concern. Ingat!',
    quickReplies:['Back to menu'] },
  { patterns:['still no signal','still not working','hindi pa rin'],
    response:'Pasensya na sa abala! Mukhang kailangan na ng mas malalim na troubleshooting.',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['back to menu','menu','main menu','start over'],
    response:'Kumusta! 😊 Paano pa kita matutulungan?',
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
];

const FALLBACK = {
  response:'Pasensya na, hindi ko naintindihan ang iyong mensahe. 😅\n\nSubukan mong i-describe ang problema nang mas detalyado, o pumili sa mga option sa ibaba:',
  quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'],
};

function getBotResponse(msg) {
  const lower = msg.toLowerCase();
  let best = null, bestLen = 0;
  for (const rule of RULES) {
    for (const pat of rule.patterns) {
      if (lower.includes(pat) && pat.length > bestLen) {
        best = rule; bestLen = pat.length;
      }
    }
  }
  return best || FALLBACK;
}

function renderText(text) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1.5"/>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') ? <strong key={j}>{p.slice(2,-2)}</strong> : p
    );
    if (line.startsWith('|')) {
      const cells = line.split('|').filter(Boolean);
      if (cells.every(c => c.trim() === '---' || c.trim() === '')) return null;
      return <div key={i} className="flex gap-3 text-xs"><span className="font-semibold w-24 flex-shrink-0">{cells[0]?.trim()}</span><span className="text-gray-400">{cells[1]?.trim()}</span><span>{cells[2]?.trim()}</span></div>;
    }
    if (line.startsWith('→')) return <div key={i} className="flex items-start gap-1.5 text-xs"><span className="text-[#cc0000] flex-shrink-0 mt-0.5">→</span><span>{parts.slice(1)}</span></div>;
    if (line.startsWith('•')) return <div key={i} className="flex items-start gap-1.5 text-xs"><span className="text-[#cc0000] flex-shrink-0">•</span><span>{parts.slice(1)}</span></div>;
    return <p key={i} className="text-xs leading-relaxed">{parts}</p>;
  }).filter(Boolean);
}

const ACTION_COLORS = { red:'bg-[#cc0000] text-white hover:bg-red-700', slate:'bg-slate-700 text-white hover:bg-slate-800', emerald:'bg-emerald-600 text-white hover:bg-emerald-700', blue:'bg-blue-600 text-white hover:bg-blue-700' };

export default function CignalBot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMin] = useState(false);
  const [messages, setMessages] = useState([{ 
    id: 1, 
    from: 'bot', 
    text: `${getGreeting()}! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?`, 
    quickReplies: ['No Signal','Load/Reload','File a Ticket','Request Technician'] 
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }]);
    setInput(''); 
    setTyping(true);

    const thinkingTime = 600 + (text.length * 30);
    await new Promise(r => setTimeout(r, Math.min(thinkingTime, 2000)));
    
    const kb = getBotResponse(text);
    setTyping(false);
    setMessages(prev => [...prev, { 
      id: Date.now() + 1, 
      from: 'bot', 
      text: kb.response, 
      quickReplies: kb.quickReplies || [], 
      actions: kb.actions || [] 
    }]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{height: minimized?'auto':'420px'}}>
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#880000] to-[#cc0000] text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><Bot size={16}/></div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">CignalBot</p>
              <p className="text-xs text-red-200">AI-Powered · Online</p>
            </div>
            <button onClick={() => { setMessages([{id:1, from:'bot', text:`${getGreeting()}! Ako si **CignalBot** 🤖.`, quickReplies:['No Signal','Load/Reload']}]); }} className="hover:bg-white/20 p-1 rounded-lg"><RotateCcw size={13}/></button>
            <button onClick={() => setMin(!minimized)} className="hover:bg-white/20 p-1 rounded-lg"><ChevronDown size={15} className={`transition-transform ${minimized?'rotate-180':''}`}/></button>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 p-1 rounded-lg"><X size={15}/></button>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {messages.map(m => (
                  <div key={m.id}>
                    <div className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}>
                      {m.from==='bot' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] flex items-center justify-center text-white flex-shrink-0 mr-2 mt-0.5"><Bot size={12}/></div>}
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${m.from==='user'?'bg-[#cc0000] text-white rounded-br-sm':'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {renderText(m.text)}
                      </div>
                    </div>
                    {m.quickReplies?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-9">
                        {m.quickReplies.map((q,i) => (
                          <button key={i} onClick={() => sendMessage(q)} className="text-xs border border-[#cc0000] text-[#cc0000] bg-white px-2.5 py-1 rounded-full hover:bg-red-50 transition-colors">{q}</button>
                        ))}
                      </div>
                    )}
                    {m.actions?.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1.5 ml-9">
                        {m.actions.map((a,i) => (
                          <button key={i} onClick={() => { setOpen(false); navigate(a.path); }}
                            className={`text-left text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${ACTION_COLORS[a.color]||ACTION_COLORS.red}`}>{a.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#cc0000] to-[#880000] flex items-center justify-center text-white flex-shrink-0 mr-2"><Bot size={12}/></div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                      <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2 bg-white flex-shrink-0">
                <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage(input)} placeholder="Ilagay ang mensahe..." disabled={typing} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#cc0000] disabled:bg-gray-50"/>
                <button onClick={() => sendMessage(input)} disabled={!input.trim()||typing} className="bg-[#cc0000] hover:bg-red-700 text-white p-2 rounded-xl disabled:opacity-50 flex-shrink-0"><Send size={13}/></button>
              </div>
              <p className="text-center text-gray-400 pb-2 bg-white" style={{fontSize:'9px'}}>Rule-based AI · Not a real agent</p>
            </>
          )}
        </div>
      )}
      <button onClick={() => { setOpen(!open); setMin(false); }} className="w-14 h-14 bg-[#cc0000] hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 relative">
        {open ? <X size={24}/> : <MessageCircle size={24}/>}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"/>
      </button>
    </div>
  );
}