export const CHATBOT_RULES = [
  { patterns:['hello','hi','hey','good morning','good afternoon','good evening','kumusta','magandang'],
    response:'Kumusta! Ako si **CignalBot** 🤖, ang AI support assistant ng CignalCare+.\n\nPaano kita matutulungan ngayon?',
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['salamat','thank you','thanks','maraming salamat'],
    response:'Walang anuman! 😊 Kung may iba pa kang katanungan, nandito lang ako.\n\nMaganda ang araw sayo!',
    quickReplies:['Back to menu'] },
  { patterns:['e1','error 1','e-1','no satellite signal'],
    response:'**Error E1 — No Satellite Signal**\n\nMga dapat gawin:\n→ Suriin ang satellite cable sa likod ng box\n→ Tingnan kung nakakonekta ang cable sa LNB ng dish\n→ I-restart ang box (cabutan ng 10 segundo)\n→ Check kung may bagyo o malakas na ulan\n\nKung hindi pa rin ayos:',
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
    response:'**Walang Signal / No Signal**\n\nGawin ito step by step:\n→ I-check ang HDMI/AV input ng TV\n→ Suriin ang cable sa likod ng Cignal box\n→ I-restart ang box (cabutan ng power 10 segundo)\n→ Kung may bagyo, hintayin matapos ang ulan\n\nKung wala pa ring signal pagkatapos ng ulan:',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['frozen','freeze','naka-freeze','pixelated','blocking','blocky'],
    response:'**Frozen / Pixelated Screen**\n\nIto ay karaniwang dahil sa mahinang signal:\n→ Hintayin ang ulan o bagyo\n→ Subukan ang channel scan (Settings > Channel Scan)\n→ I-restart ang Cignal box\n\nKung paulit-ulit ito kahit maliwanag ang panahon:',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'}] },
  { patterns:['no sound','walang tunog','no audio','walang audio','muted'],
    response:'**Walang Tunog / No Audio**\n\n→ Siguraduhing hindi naka-mute ang TV\n→ I-check ang audio settings ng Cignal box\n→ Subukan ang ibang channel\n→ I-restart ang box\n\nKung lahat ng channel ay walang tunog:',
    actions:[{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['remote','rimokon','hindi gumagana remote','remote not working'],
    response:'**Remote Control Problem**\n\n→ Palitan ang baterya (2×AA batteries)\n→ Siguraduhing walang harang sa IR sensor ng box\n→ Subukang i-point nang direkta sa box\n→ I-reset ang box gamit ang power button sa unit mismo' },
  { patterns:['restart','i-restart','reboot','on off','pag-off'],
    response:'**Paano I-restart ang Cignal Box:**\n\n→ Pindutin ang power button sa box OR\n→ Cabutan ang kuryente ng 10-15 segundo\n→ Hintayin ng 1-2 minuto para mag-boot\n→ Ang channels ay mag-a-appear ulit pagkatapos ng boot-up' },
  { patterns:['load','reload','prepaid','bayad','mag-load','how to load','paano mag-load','gcash','maya','payment'],
    response:'**Prepaid Load Request**\n\nMaaari mong makita ang kasalukuyang available load plans sa **Load Request** page. Ang online payment flow ng system ay gumagamit ng **PayMongo** kapag available.\n\nBuksan ang Load Request para makita ang updated plans at payment options:',
    actions:[{label:'📱 Request Remote Load',path:'/user/load-request',color:'emerald'}] },
  { patterns:['channel','channels','wala','missing channel','nawala','channel scan'],
    response:'**Nawala ang Channel / Missing Channels**\n\n→ Gawin ang **Channel Scan** (Settings > Channel Scan)\n→ Siguraduhing active ang iyong subscription\n→ Kung expired, kailangan mag-reload\n\nKung may kasalukuyang aktibong subscription pero wala pa ring channel:',
    quickReplies:['Do Channel Scan','Check Subscription','File a Ticket'] },
  { patterns:['channel scan','how to scan','paano mag-scan'],
    response:'**Paano Gumawa ng Channel Scan:**\n\n1. Pindutin ang **MENU** button sa remote\n2. Pumunta sa **Setup** o **Settings**\n3. Piliin ang **Satellite/Channel Search**\n4. Piliin ang **Auto Scan** o **Full Scan**\n5. Hintayin na matapos ang scan (5-10 minuto)\n6. I-save ang mga channel' },
  { patterns:['dish','antenna','satellite dish','i-align','alignment'],
    response:'**Dish Alignment Problem**\n\nAng dish alignment ay kailangang gawin ng technician. Huwag subukang i-adjust ang dish nang walang proper equipment.\n\nMag-request ng technician:',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['box','cignal box','decoder','receiver','wont turn on','hindi nag-o-on'],
    response:'**Cignal Box Problem**\n\n→ I-check kung nakakonekta ang power cable\n→ Subukang ibang power outlet\n→ Check ang indicator light sa box\n→ Kung walang indicator light, maaaring sira ang box\n\nKung sira na ang box:',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'},{label:'📋 Report Issue',path:'/user/report-problem',color:'red'}] },
  { patterns:['subscription','account','account number','cca','retrieve','info'],
    response:'**Account Information**\n\nMaari mong i-check ang iyong account details gamit ang CCA Inquiry:',
    actions:[{label:'👤 CCA / Account Inquiry',path:'/user/retrieve-info',color:'blue'}] },
  { patterns:['ticket','report','problema','issue','concern','file'],
    response:'**Mag-file ng Support Ticket**\n\nPara sa mga isyu na kailangan ng mas malalim na atensyon, mag-file ng support ticket at ang aming team ay tutugon sa loob ng 24 oras:',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🎫 My Tickets',path:'/user/tickets',color:'slate'}] },
  { patterns:['technician','tech','repair','ayusin','sira','visit'],
    response:'**Request Technician Visit**\n\nMag-request ng on-site technician para sa mga pisikal na problema (dish alignment, cable replacement, box repair):',
    actions:[{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['rain','ulan','storm','bagyo','weather','signal loss during rain'],
    response:'**Signal Loss During Rain/Storm**\n\nIto ay **normal** para sa satellite TV. Tinatawag itong "rain fade."\n\n→ Hintayin na tumigil ang ulan o bagyo\n→ Karaniwang bumabalik ang signal pagkatapos ng 5-30 minuto\n→ Kung hindi bumabalik pagkatapos ng 1 oras pagkatapos ng ulan:',
    quickReplies:['Still no signal after rain'] },
  { patterns:['coverage','balayan','calaca','lian','calatagan','nasugbu','lemery','area','covered'],
    response:'**Coverage Areas:**\n\nSiniserbisyuhan ng Descallar Satellite Services ang mga sumusunod na lugar sa Batangas:\n\n• Balayan\n• Calaca\n• Lian\n• Calatagan\n• Nasugbu\n• Lemery\n\nPara sa inquiries, tumawag sa **0975-571-8056** o **0917-511-9647**' },
  { patterns:['contact','phone','number','address','location','office'],
    response:'**Contact Information:**\n\n📍 Langgangan, Balayan, Batangas\n📞 0975-571-8056\n📞 0917-511-9647\n\n*Service hours: Monday to Saturday, 8:00 AM - 5:00 PM*' },
  { patterns:['what can you do','ano ang kaya mo','help','tulong','ano maari','capabilities'],
    response:'**Kaya Kong Gawin para sa Iyo:**\n\n→ Tulungan sa signal at technical issues\n→ I-explain ang error codes (E1-E16)\n→ Gabayan sa channel scan at troubleshooting\n→ I-assist sa load/prepaid inquiries\n→ I-direct sa pagfile ng ticket o tech request\n→ Bigyan ng contact at coverage info\n\nAno ang problema mo ngayon?',
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
  { patterns:['bye','goodbye','paalam','ingat'],
    response:'Paalam! 👋 Sana naayos ang iyong concern. Huwag mahiyang bumalik kung kailangan mo ng tulong. Ingat!',
    quickReplies:['Back to menu'] },
  { patterns:['still no signal','still not working','hindi pa rin'],
    response:'Pasensya na sa abala! Mukhang kailangan na ng mas malalim na troubleshooting.\n\nMagrerekomenda ako ng dalawang option:',
    actions:[{label:'📋 File a Ticket',path:'/user/report-problem',color:'red'},{label:'🔧 Request Technician',path:'/user/technician-request',color:'slate'}] },
  { patterns:['back to menu','menu','main menu','start over'],
    response:'Kumusta! 😊 Paano pa kita matutulungan?',
    quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'] },
];

export const CHATBOT_FALLBACK = {
  response:'Pasensya na, hindi ko naintindihan ang iyong mensahe. 😅\n\nSubukan mong i-describe ang problema nang mas detalyado, o pumili sa mga option sa ibaba:',
  quickReplies:['No Signal','Load/Reload','File a Ticket','Request Technician'],
};

function patternMatches(message, pattern) {
  const normalizedMessage = String(message || '').toLowerCase().trim();
  const normalizedPattern = String(pattern || '').toLowerCase().trim();

  if (!normalizedMessage || !normalizedPattern) return false;

  // Multi-word phrases keep phrase matching. Single words use word boundaries so
  // a rule like "wala" does not accidentally match "nawawala".
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

  // Broad matching is reserved for the offline/API-error fallback so the
  // chatbot remains useful even when Gemini is temporarily unavailable.
  if (broad) return best;

  // Keep deterministic commands fast and free. Longer conversational
  // questions are intentionally sent to Gemini for natural-language handling.
  const isShortDirectCommand = normalized.length <= 32;
  const isExactKnownPhrase = (best.patterns || []).some(
    (pattern) => normalized === String(pattern || '').toLowerCase().trim()
  );
  const isErrorCode = /^e-?\d+$/i.test(normalized) || /^error\s*\d+$/i.test(normalized);

  return isShortDirectCommand || isExactKnownPhrase || isErrorCode ? best : null;
}

const LIVE_SYSTEM_DATA_PATTERNS = [
  // Dynamic prepaid/load information should come from the current database.
  'load', 'reload', 'prepaid', 'plan', 'package', 'payment', 'paymongo',
  'available load', 'available plan', 'channel lineup', 'channels included',

  // Personal status questions must reach the authenticated backend lookup.
  'ticket status', 'status ng ticket', 'my ticket', 'ticket ko',
  'technician status', 'status ng technician', 'my technician',
  'technician request ko', 'load request status', 'status ng load request',
  'my load request', 'load request ko', 'payment status', 'status ng payment',

  // Troubleshooting questions should use the configured troubleshooting records.
  'no signal', 'walang signal', 'blank screen', 'black screen', 'no picture',
  'remote', 'remote not working', 'receiver', 'cignal box', 'decoder',
  'hd channel', 'missing channel', 'recording', 'dvr', 'troubleshoot',
  'technical problem', 'screen problem', 'signal problem',
];

export function shouldUseLiveSystemData(message) {
  const normalized = String(message || '').toLowerCase().trim();
  if (!normalized) return false;

  return LIVE_SYSTEM_DATA_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

