'use strict';
// Keep this module side-effect free and usable without a database connection.
const { normalizePhilippinePhone } = require('../services/smsService');
const GROUPS = new Set(['signal','channels','receiver','remote','prepaid','installation','other']);
const GROUP_ISSUES = Object.freeze({
 signal: {'no_signal':'No Signal','weak_signal':'Weak Signal','intermittent_signal':'Intermittent Signal',
  'pixelated_signal':'Pixelated Picture','rain_signal_loss':'Signal Lost During Rain','low_signal_quality':'Low Signal Quality'},
 channels: {'missing_channels':'Missing Channels','channel_unavailable':'Channel Not Available',
  'black_screen':'Black / Blue Screen','frozen_picture':'Frozen Picture','no_audio':'No Audio','distorted_audio':'Distorted Audio'},
 receiver: {'receiver_no_power':'Receiver Not Turning On','receiver_restart':'Receiver Keeps Restarting',
  'receiver_freezes':'Receiver Freezes','receiver_error':'Receiver Error Message','smart_card':'Smart Card Problem'},
 remote: {'remote_not_working':'Remote Not Working','remote_buttons':'Remote Buttons Not Responding',
  'hdmi_rca':'HDMI / RCA Connection Problem','wrong_input':'Incorrect TV Input / Source'},
 prepaid: {'load_not_reflected':'Load Not Reflected','channels_not_activated':'Channels Not Activated After Loading',
  'incorrect_load':'Incorrect Load','subscription_expired':'Subscription Expired','payment_concern':'Loading Transaction Concern'},
 installation: {'dish_alignment':'Dish Alignment Concern','damaged_cable':'Loose / Damaged Cable',
  'dish_relocation':'Dish Relocation','installation_issue':'Installation Problem','equipment_inspection':'Equipment Inspection'},
 other: {'other':'Problem Not Listed','general_service':'General Service Concern'},
});
const LEGACY_CATEGORIES=Object.freeze({
 signal:'Connection Issue',channels:'Channel Concern',receiver:'Technical Problem',
 remote:'Technical Problem',prepaid:'Billing Concern',installation:'Technical Problem',other:'Other',
});
const ISSUE_CODES = new Set(Object.values(GROUP_ISSUES).flatMap(x=>Object.keys(x)));
const METHODS = new Set(['chat','call','sms','email']);
function bad(message) { const error = new Error(message); error.statusCode = 400; return error; }
function text(value,max=200) { return String(value??'').trim().slice(0,max); }
function validOptionalPhone(value, label) {
 const t=text(value,32); if (!t) return '';
 const normalized=normalizePhilippinePhone(t);
 if (!normalized) throw bad(`${label} must be a valid Philippine mobile number.`);
 return normalized;
}
function normalizeSupportDetails(raw) {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad('Invalid ticket support details.');
 const group=text(raw.group,60), issueCode=text(raw.issueCode,80);
 if (!GROUPS.has(group) || !ISSUE_CODES.has(issueCode) || !Object.hasOwn(GROUP_ISSUES[group],issueCode)) throw bad('Invalid specific problem for this category.');
 let diagnostics = raw.diagnostics || {};
 if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) throw bad('Invalid diagnostic answers.');
 diagnostics = Object.fromEntries(Object.entries(diagnostics).slice(0,12).map(([k,v])=>[text(k,40),text(v,160)]));
 const email=text(raw.email,254).toLowerCase();
 if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Invalid contact email.');
 const preferredMethod=text(raw.preferredMethod,12)||'chat';
 if (!METHODS.has(preferredMethod)) throw bad('Invalid preferred contact method.');
 return {
   group, issueCode, issueLabel:GROUP_ISSUES[group][issueCode], legacyCategory:LEGACY_CATEGORIES[group], diagnostics:JSON.stringify(diagnostics),
   receiverModel:text(raw.receiverModel,100), receiverCode:text(raw.receiverCode,40),
   phone:validOptionalPhone(raw.phone,'Mobile number'),
   alternativePhone:validOptionalPhone(raw.alternativePhone,'Alternative mobile number'),
   email, preferredMethod, smsOptIn:raw.smsOptIn === true, emailOptIn:raw.emailOptIn === true,
 };
}
module.exports = {normalizeSupportDetails, ISSUE_CODES};
