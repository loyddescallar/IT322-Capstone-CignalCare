export const CHATBOT_RULES = [
  { patterns:['hello','hi','hey','good morning','good afternoon','good evening','kumusta','magandang'], response:'Kumusta! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?', quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['salamat','thank you','thanks','maraming salamat'], response:'Walang anuman! 😊 Kung may iba pa kang katanungan, nandito lang ako.', quickReplies:['Back to menu'] },
  { patterns:['e1','error 1','e-1','e2','error 2','e-2','e11','error 11','e-11','smartcard','smart card'], response:'**Smart Card Error**\n\nThe verified troubleshooting guide for E1, E2, and E11 is available in CignalCare+. Open Troubleshooting so the current configured steps are used.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'}] },
  { patterns:['e3','error 3','e-3'], response:'**Error Code E3**\n\nWalang verified E3-specific procedure sa kasalukuyang CignalCare+ troubleshooting data. I-describe ang exact TV message o symptom para hindi tayo manghula.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'}] },
  { patterns:['e4','error 4','e-4','e6','error 6','e-6','e14','error 14','e-14'], response:'**Technical / Signal Error**\n\nThe verified troubleshooting guide for E4, E6, and E14 is available in CignalCare+. Open Troubleshooting so the current configured steps are used.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'}] },
  { patterns:['e5','error 5','e-5'], response:'**Error Code E5**\n\nWalang verified E5-specific procedure sa kasalukuyang CignalCare+ troubleshooting data. I-describe ang exact message sa TV para ma-check ang tamang support flow.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📱 Open Load Request',path:'/user/load-request',color:'emerald'}] },
  { patterns:['no signal','walang signal','wala signal','blank','blangko','black screen','walang picture','no picture'], response:'**Walang Signal / No Signal**\n\nGamitin ang verified Troubleshooting guide para sa current configured steps. Kung hindi ma-resolve, puwede kitang tulungang ihanda ang support ticket o technician request.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['frozen','freeze','naka-freeze','pixelated','blocking','blocky'], response:'**Frozen / Pixelated Screen**\n\nI-describe kung kailan nangyayari at kung lahat o isang channel lang ang affected. Gagamitin ng CignalBot ang verified troubleshooting data kapag available.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'}] },
  { patterns:['no sound','walang tunog','no audio','walang audio','muted'], response:'**Walang Tunog / No Audio**\n\nGamitin ang verified Troubleshooting guide para sa audio/video checks. Kung hindi ma-resolve, puwede kang mag-file ng ticket.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['remote','rimokon','hindi gumagana remote','remote not working'], response:'**Remote Control Problem**\n\nGamitin ang verified Troubleshooting guide para sa current remote-control steps.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'}] },
  { patterns:['restart','i-restart','reboot','on off','pag-off'], response:'**Restarting the Cignal Box**\n\nPara sa exact current procedure, gamitin ang Troubleshooting page dahil doon nanggagaling ang verified support steps.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'}] },
  { patterns:['load','reload','prepaid','bayad','mag-load','how to load','paano mag-load','gcash','maya','payment'], response:'**Prepaid Load Request**\n\nMaaari mong makita ang kasalukuyang available load plans sa **Load Request** page. Ang online payment flow ng system ay gumagamit ng **PayMongo** kapag available.', actions:[{label:'📱 Request Remote Load',path:'/user/load-request',color:'emerald'}] },
  { patterns:['channel','channels','wala','missing channel','nawala','channel scan'], response:'**Channel Concern**\n\nGamitin ang verified Troubleshooting guide at i-check din kung ang channel ay kasama sa current active prepaid plan.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'📱 Check Load Plans',path:'/user/load-request',color:'emerald'}] },
  { patterns:['dish','antenna','satellite dish','i-align','alignment'], response:'**Dish Alignment Problem**\n\nHuwag i-adjust ang dish nang walang proper equipment. Mag-request ng technician para sa dish alignment o physical repair.', actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['box','cignal box','decoder','receiver','wont turn on','hindi nag-o-on'], response:'**Cignal Box Problem**\n\nGamitin ang verified Troubleshooting guide. Kung may physical damage, unusual heat, burnt smell, o hindi pa rin gumagana pagkatapos ng safe checks, mag-request ng technician.', actions:[{label:'🛠 Open Troubleshooting',path:'/troubleshoot',color:'blue'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['subscription','account','account number','cca','retrieve','info'], response:'**Account Information**\n\nMaari mong i-check ang iyong permitted account details gamit ang CCA Inquiry:', actions:[{label:'👤 CCA / Account Inquiry',path:'/user/retrieve-info',color:'blue'}] },
  { patterns:['ticket','report','problema','issue','concern','file'], response:'**Mag-file ng Support Ticket**\n\nPara sa concern na kailangan ng support review, mag-file ng ticket. Kung may troubleshooting conversation tayo, puwedeng ihanda ng CignalBot ang draft para ma-review mo bago i-submit.', actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🎫 My Tickets',path:'/user/tickets',color:'slate'}] },
  { patterns:['technician','tech','repair','ayusin','sira','visit'], response:'**Request Technician Visit**\n\nMag-request ng on-site technician para sa physical issues gaya ng dish alignment, cable replacement, o box repair. Review mo muna ang request bago submission.', actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['rain','ulan','storm','bagyo','weather','signal loss during rain'], response:'**Signal Loss During Rain/Storm**\n\nMalakas na ulan o masamang panahon ay maaaring makaapekto sa satellite signal. Hintaying humupa ang panahon at i-check muli. Kung nagpapatuloy ang problema sa maayos na panahon:', quickReplies:['Still no signal after rain'] },
  { patterns:['coverage','balayan','calaca','lian','calatagan','nasugbu','lemery','area','covered'], response:'**Coverage Areas:**\n\nSiniserbisyuhan ng Descallar Satellite Services ang mga sumusunod na lugar sa Batangas:\n\n• Balayan\n• Calaca\n• Lian\n• Calatagan\n• Nasugbu\n• Lemery\n\nPara sa inquiries, tumawag sa **0975-571-8056** o **0917-511-9647**' },
  { patterns:['contact','phone','number','address','location','office'], response:'**Contact Information:**\n\n📍 Langgangan, Balayan, Batangas\n📞 0975-571-8056\n📞 0917-511-9647\n\n*Service hours: Monday to Saturday, 8:00 AM - 5:00 PM*' },
  { patterns:['what can you do','ano ang kaya mo','help','tulong','ano maari','capabilities'], response:'**Kaya Kong Gawin para sa Iyo:**\n\n→ Gumamit ng verified troubleshooting data\n→ I-assist sa current load/prepaid information\n→ I-check ang permitted ticket, technician, at payment status\n→ I-explain ang Admin-confirmed issue sa iyong location\n→ Ihanda ang ticket o technician-request draft para ma-review mo\n\nAno ang problema mo ngayon?', quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['bye','goodbye','paalam','ingat'], response:'Paalam! 👋 Huwag mahiyang bumalik kung kailangan mo ng tulong.', quickReplies:['Back to menu'] },
  { patterns:['still no signal','still not working','hindi pa rin','wala pa rin','ayaw pa rin'], response:'Mukhang hindi na-resolve ng initial support flow. Puwede kitang tulungang ihanda ang susunod na request para ma-review mo bago i-submit.', actions:[{label:'📋 Prepare Ticket Draft',path:'/user/report-problem',color:'red'},{label:'🔧 Prepare Technician Draft',path:'/user/technician-request',color:'slate'}] },
  { patterns:['back to menu','menu','main menu','start over'], response:'Kumusta! 😊 Paano pa kita matutulungan?', quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
];

export const CHATBOT_FALLBACK = {
  response:'Pasensya na, hindi ko naintindihan ang iyong mensahe. 😅\n\nI-describe ang concern nang mas detalyado, o pumili sa mga option sa ibaba:',
  quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'],
};

function patternMatches(message, pattern) {
  const normalizedMessage = String(message || '').toLowerCase().trim();
  const normalizedPattern = String(pattern || '').toLowerCase().trim();

  if (!normalizedMessage || !normalizedPattern) return false;

  if (normalizedPattern.includes(' ')) {
    return normalizedMessage.includes(normalizedPattern);
  }

  const escaped = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(normalizedMessage);
}

function findBestRule(message) {
  let best = null;
  let bestLength = 0;

  for (const rule of CHATBOT_RULES) {
    for (const pattern of rule.patterns || []) {
      if (patternMatches(message, pattern) && pattern.length > bestLength) {
        best = rule;
        bestLength = pattern.length;
      }
    }
  }

  return best;
}

export function getRuleBasedResponse(message, { broad = false } = {}) {
  const normalized = String(message || '').toLowerCase().trim();
  if (!normalized) return null;

  const best = findBestRule(normalized);
  if (!best) return null;
  if (broad) return best;

  const isShortDirectCommand = normalized.length <= 32;
  const isExactKnownPhrase = (best.patterns || []).some(
    (pattern) => normalized === String(pattern || '').toLowerCase().trim()
  );

  return isShortDirectCommand || isExactKnownPhrase ? best : null;
}

const LIVE_SYSTEM_DATA_PATTERNS = [
  'load', 'reload', 'prepaid', 'plan', 'package', 'payment', 'paymongo',
  'available load', 'available plan', 'channel lineup', 'channels included',
  'ticket status', 'status ng ticket', 'my ticket', 'ticket ko',
  'technician status', 'status ng technician', 'my technician',
  'technician request ko', 'load request status', 'status ng load request',
  'my load request', 'load request ko', 'payment status', 'status ng payment',
  'no signal', 'walang signal', 'blank screen', 'black screen', 'no picture',
  'remote', 'receiver', 'cignal box', 'decoder', 'missing channel', 'recording',
  'dvr', 'troubleshoot', 'technical problem', 'screen problem', 'signal problem',
  'smart card', 'smartcard', 'audio', 'sound', 'power', 'hdmi', 'dish',
  'rain', 'storm', 'frozen', 'pixelated', 'channel scan', 'weak signal',
];

export function shouldUseLiveSystemData(message) {
  const normalized = String(message || '').toLowerCase().trim();
  if (!normalized) return false;

  // Error codes and technical issues must use backend-controlled knowledge.
  if (/^(?:error\s*)?e-?\d+$/i.test(normalized) || /\be-?\d+\b/i.test(normalized)) {
    return true;
  }

  return LIVE_SYSTEM_DATA_PATTERNS.some((pattern) => normalized.includes(pattern));
}
