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

export function findGroupFromPrefill(category = '', subject = '') {
  const c = String(category).toLowerCase();
  const s = String(subject).toLowerCase();
  if (/signal|connection/.test(c) || /signal|pixelat/.test(s)) return 'signal';
  if (/channel/.test(c) || /channel/.test(s)) return 'channels';
  if (/bill|load|payment/.test(c) || /load|payment|reload/.test(s)) return 'prepaid';
  if (/technician|installation/.test(c)) return 'installation';
  if (/remote|hdmi/.test(s)) return 'remote';
  if (/technical|receiver|box|smart.?card/.test(c + ' ' + s)) return 'receiver';
  return 'other';
}
export function getGroup(id) { return REPORT_GROUPS.find(g => g.id === id) || REPORT_GROUPS[0]; }
export function getIssue(group, issueCode) { return group.issues.find(([code]) => code === issueCode) || group.issues[0]; }
