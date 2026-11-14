// User-facing labels may evolve; legacyCategory keeps existing Admin Tickets filters stable.
export const REPORT_GROUPS = [
  { id: 'signal', label: 'Satellite Signal & Reception', legacyCategory: 'Connection Issue', issues: [
    ['no_signal','No Signal'], ['weak_signal','Weak Signal'], ['intermittent_signal','Intermittent Signal'],
    ['pixelated_signal','Pixelated Picture'], ['rain_signal_loss','Signal Lost During Rain'], ['low_signal_quality','Low Signal Quality'],
  ] },
  { id: 'channels', label: 'Channels & Viewing', legacyCategory: 'Channel Concern', issues: [
    ['missing_channels','Missing Channels'], ['channel_unavailable','Channel Not Available'], ['black_screen','Black / Blue Screen'],
    ['frozen_picture','Frozen Picture'], ['no_audio','No Audio'], ['distorted_audio','Distorted Audio'],
  ] },
  { id: 'receiver', label: 'Cignal Box / Receiver', legacyCategory: 'Technical Problem', issues: [
    ['receiver_no_power','Receiver Not Turning On'], ['receiver_restart','Receiver Keeps Restarting'],
    ['receiver_freezes','Receiver Freezes'], ['receiver_error','Receiver Error Message'], ['smart_card','Smart Card Problem'],
  ] },
  { id: 'remote', label: 'Remote & Connections', legacyCategory: 'Technical Problem', issues: [
    ['remote_not_working','Remote Not Working'], ['remote_buttons','Remote Buttons Not Responding'],
    ['hdmi_rca','HDMI / RCA Connection Problem'], ['wrong_input','Incorrect TV Input / Source'],
  ] },
  { id: 'prepaid', label: 'Prepaid Load & Activation', legacyCategory: 'Billing Concern', issues: [
    ['load_not_reflected','Load Not Reflected'], ['channels_not_activated','Channels Not Activated After Loading'],
    ['incorrect_load','Incorrect Load'], ['subscription_expired','Subscription Expired'], ['payment_concern','Loading Transaction Concern'],
  ] },
  { id: 'installation', label: 'Dish & Installation', legacyCategory: 'Technical Problem', issues: [
    ['dish_alignment','Dish Alignment Concern'], ['damaged_cable','Loose / Damaged Cable'],
    ['dish_relocation','Dish Relocation'], ['installation_issue','Installation Problem'], ['equipment_inspection','Equipment Inspection'],
  ] },
  { id: 'other', label: 'Other Concerns', legacyCategory: 'Other', issues: [
    ['other','Problem Not Listed'], ['general_service','General Service Concern'],
  ] },
];

export const RECEIVER_MODELS = ['Not sure / I do not know', 'Changhong HD', 'Arion HD Cardless', 'GIEC HD', 'Skyworth HD', 'Humax', 'PACE', 'Samsung HD', 'Other model'];
export const RECEIVER_CODES = ['No code shown', 'E1', 'E2', 'E4', 'E6', 'E11', 'E14', 'Other error code', 'Not sure'];
export const CONTACT_METHODS = [
  ['chat', 'Website Chat'], ['call', 'Phone Call'], ['sms', 'SMS'], ['email', 'Email'],
];

const q = (id, label, options) => ({ id, label, options });
export function questionsFor(groupId, issueCode) {
  if (groupId === 'signal') return [
    q('affected_channels','Which channels are affected?',['All channels','Some channels','Not sure']),
    q('started','When did the issue start?',['Today','Yesterday','Several days ago','Not sure']),
    q('weather','Weather when it started',['Clear / Normal','Heavy rain / Storm','Not sure']),
  ];
  if (groupId === 'channels') return [
    q('affected_channels','How many channels are affected?',['All channels','Some channels','Not sure']),
    q('after_load','Did it start after a load or subscription change?',['Yes','No','Not sure']),
    q('started','When did it start?',['Today','Yesterday','Earlier','Not sure']),
  ];
  if (groupId === 'receiver') return [
    q('started','When did it start?',['Today','Yesterday','Earlier','Not sure']),
    q('receiver_lights','Does the box show power/indicator lights?',['Yes','No','Not sure']),
    q('restart_attempted','Have you tried restarting the receiver?',['Yes','No','Not sure']),
  ];
  if (groupId === 'remote') return [
    q('affected_buttons','Which buttons are affected?',['All buttons','Some buttons','Not sure']),
    q('batteries','Were the batteries checked?',['Yes','No','Not sure']),
  ];
  if (groupId === 'prepaid') return [
    q('payment_method','Where did you load/pay?',['CignalCare+','Retailer / Agent','E-wallet / Bank','Other / Not sure']),
    q('transaction_time','When was the payment made?',['Today','Yesterday','Earlier','Not sure']),
  ];
  if (groupId === 'installation') return [
    q('service_type','What kind of setup is affected?',['Existing installation','New installation','Relocation','Not sure']),
    q('safety','Is there a visible loose or damaged cable?',['Yes','No','Not sure']),
  ];
  return [q('started','When did the problem start?',['Today','Yesterday','Earlier','Not sure'])];
}

// Prefer the actual symptom in a drafted ticket over a broad legacy category.
export function findGroupFromPrefill(category = '', subject = '') {
  const c = String(category).toLowerCase();
  const s = String(subject).toLowerCase();
  if (/no[ -]?signal|weak[ -]?signal|intermittent[ -]?signal|pixelat|signal lost|walang signal|low signal|rain.*signal/.test(s)) return 'signal';
  if (/missing channels?|channel not available|black[ /-]?screen|blue screen|frozen picture|no audio|distorted audio/.test(s)) return 'channels';
  if (/remote|hdmi|rca|tv input|tv source/.test(s)) return 'remote';
  if (/load not reflected|load not activated|subscription expired|loading transaction|payment concern|payment not recorded|incorrect load/.test(s)) return 'prepaid';
  if (/receiver|smart card|set.?top box|box (not turning|keeps restarting|freezes)/.test(s)) return 'receiver';
  if (/dish|installation|relocation|damaged cable|equipment inspection/.test(s)) return 'installation';
  if (/signal|connection/.test(c)) return 'signal';
  if (/channel/.test(c)) return 'channels';
  if (/bill|load|payment/.test(c)) return 'prepaid';
  if (/technician|installation/.test(c)) return 'installation';
  if (/technical|receiver|box|smart.?card/.test(c)) return 'receiver';
  return 'other';
}

// Prefilled CignalBot/troubleshooting tickets should select the specific issue
// identified by their subject, rather than always the category's first item.
export function findIssueFromPrefill(groupId, subject = '') {
  const group = getGroup(groupId);
  const value = String(subject).trim().toLowerCase();
  const rules = [
    ['intermittent_signal', /intermittent signal|signal (comes and goes|keeps dropping)/],
    ['pixelated_signal', /pixelat/],
    ['rain_signal_loss', /signal.*(rain|storm)|rain.*signal/],
    ['low_signal_quality', /low signal quality/],
    ['weak_signal', /weak signal|mahina.*signal/],
    ['no_signal', /no[ -]?signal|signal lost|walang signal/],
    ['missing_channels', /missing channels?|no channels?/],
    ['channel_unavailable', /channel not available/],
    ['black_screen', /black[ /-]?screen|blue screen|blank screen/],
    ['frozen_picture', /frozen picture|picture freezes/],
    ['no_audio', /no audio|no sound/],
    ['distorted_audio', /distorted audio/],
    ['receiver_no_power', /receiver not turning|box not turning|receiver won.t turn on/],
    ['receiver_restart', /receiver.*restart|box keeps restarting/],
    ['receiver_freezes', /receiver freezes|box freezes/],
    ['receiver_error', /receiver error|error code|\be(?:1|2|4|6|11|14)\b/],
    ['smart_card', /smart card/],
    ['remote_not_working', /remote.*not working|remote control issue/],
    ['remote_buttons', /remote buttons|buttons not responding/],
    ['hdmi_rca', /hdmi|rca/],
    ['wrong_input', /tv input|tv source/],
    ['load_not_reflected', /load not reflected/],
    ['channels_not_activated', /channels? not activated/],
    ['incorrect_load', /incorrect load/],
    ['subscription_expired', /subscription expired/],
    ['payment_concern', /payment concern|payment not recorded/],
    ['dish_alignment', /dish alignment/],
    ['damaged_cable', /damaged cable|loose cable/],
    ['dish_relocation', /dish relocation/],
    ['installation_issue', /installation problem/],
    ['equipment_inspection', /equipment inspection/],
  ];
  const permitted = new Set(group.issues.map(([code]) => code));
  const specific = rules.find(([code,re]) => permitted.has(code) && re.test(value));
  if (specific) return specific[0];
  const exact = group.issues.find(([,label]) => label.toLowerCase()===value);
  return exact?.[0] || group.issues[0][0];
}

export function getGroup(id) { return REPORT_GROUPS.find(g => g.id === id) || REPORT_GROUPS[0]; }
export function getIssue(group, issueCode) { return group.issues.find(([code]) => code === issueCode) || group.issues[0]; }
