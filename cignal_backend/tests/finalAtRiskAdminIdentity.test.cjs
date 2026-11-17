// CignalCare+ final risk threshold + private administrator profile audit.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=(name)=>fs.readFileSync(path.resolve(__dirname,'../..',name),'utf8');
const lifecycle=require('../utils/subscriberLifecycle');
const {isAtRisk,equipmentCheckRequired}=require('../utils/atRiskReload');
const now=new Date('2026-11-18T08:00:00+08:00');
const days=(n)=>new Date(now.getTime()-n*86400000);
test('120-day threshold moves Archive Eligible into At Risk; 60–119 are Inactive',()=>{
 for(const [day,status] of [[0,'Active'],[59,'Active'],[60,'Inactive'],[89,'Inactive'],[90,'Inactive'],[119,'Inactive'],[120,'At Risk'],[180,'At Risk']]) {
  assert.equal(lifecycle.subscriberLifecycle(days(day),now),status);
 }
 assert.equal(lifecycle.subscriberLifecycle(null,now),'No Load Yet');
});
test('At Risk reload confirmation requires equipment check and working screen for online payments',()=>{
 assert.equal(isAtRisk(days(119),now),false);
 assert.equal(isAtRisk(days(120),now),true);
 assert.equal(equipmentCheckRequired(days(120),false,'channel_1_ok',now),true);
 assert.equal(equipmentCheckRequired(days(120),true,'no_signal',now),true);
 assert.equal(equipmentCheckRequired(days(120),true,'channel_1_ok',now),false);
 assert.equal(equipmentCheckRequired(days(119),false,'no_signal',now),false);
});
test('retired Archive Eligible label is removed from both front and backend business flow',()=>{
 for(const file of ['cignal_backend/utils/subscriberLifecycle.js','Cignal_Frontend/src/utils/adminBusinessRules.js',
 'cignal_backend/models/userModel.js','Cignal_Frontend/src/utils/adminKpiLocation.js',
 'Cignal_Frontend/src/pages/admin/AdminCustomers.jsx','Cignal_Frontend/src/pages/admin/AdminCustomerProfile.jsx',
 'Cignal_Frontend/src/pages/admin/AdminPOS.jsx']) assert.doesNotMatch(src(file),/Archive Eligible|archiveEligibleCount/);
});
test('both backend load payment flows check 120-day equipment verification before writing',()=>{
 const pos=src('cignal_backend/controllers/loadController.js');
 const request=src('cignal_backend/controllers/loadRequestController.js');
 assert.match(pos,/isAtRisk\(customer\.lastLoadDate\) && req\.body\.equipmentCheckConfirmed !== true/);
 assert.equal((request.match(/equipmentCheckRequired\(customer\.lastLoadDate, equipment_check_confirmed, diagnostic_result\)/g)||[]).length,2);
});
test('read-only reload safety endpoint is own-account authenticated and uses the exact backend lifecycle',()=>{
 const routes=src('cignal_backend/routes/loadRoutes.js');
 const controller=src('cignal_backend/controllers/loadController.js');
 assert.match(routes,/router\.get\('\/my-reload-safety', authRequired, requireRole\('user'\), getMyReloadSafety\)/);
 assert.match(controller,/requiresEquipmentCheck: isAtRisk\(customer\.lastLoadDate\)/);
});
test('customer screens send confirmations while POS disables button without check',()=>{
 const pos=src('Cignal_Frontend/src/pages/admin/AdminPOS.jsx');
 const user=src('Cignal_Frontend/src/pages/user/UserLoadRequest.jsx');
 assert.match(pos,/equipmentCheckConfirmed: equipmentConfirmed/);
 assert.match(pos,/\|\| equipmentConfirmed\)/);
 assert.match(user,/equipment_check_confirmed: equipmentConfirmed/);
 assert.match(user,/Equipment check required/);
});
test('admin photo routes are admin-only, identity is per-account, not hardcoded demo',()=>{
 const routes=src('cignal_backend/routes/authRoutes.js');
 const sidebar=src('Cignal_Frontend/src/pages/admin/AdminWorkspace.jsx');
 const service=src('cignal_backend/services/adminProfilePhotoService.js');
 for(const verb of ['get','put','delete']) assert.match(routes,new RegExp(`router\\.${verb}\\('/admin/profile/photo', authRequired, requireRole\\('admin'\\)`));
 assert.match(sidebar,/CignalLogo4\.png/);
 assert.match(sidebar,/adminIdentity\.username/);
 assert.match(sidebar,/adminIdentity\.photo/);
 assert.doesNotMatch(sidebar,/Super Administrator/);
 assert.match(service,/WHERE user_id = \?/);
 assert.doesNotMatch(service,/CREATE TABLE|ALTER TABLE/);
});
test('private photo signatures allow genuine JPG and reject script masquerading as a photo',()=>{
 // The pure validator is loaded in isolation so database credentials aren't required.
 const vm=require('node:vm');
 const source=src('cignal_backend/services/adminProfilePhotoService.js');
 const module={exports:{}};
 const fn=new vm.Script(`(function(require,module,exports){${source}\n})`).runInNewContext({Buffer,Set});
 fn(()=>({}),module,module.exports);
 const service=module.exports;
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0,0]);
 assert.equal(service.validateProfilePhoto(`data:image/jpeg;base64,${jpeg.toString('base64')}`).mimeType,'image/jpeg');
 assert.throws(()=>service.validateProfilePhoto(`data:image/jpeg;base64,${Buffer.from('<svg/>').toString('base64')}`),/match its file type/);
 assert.throws(()=>service.validateProfilePhoto('data:image/svg+xml;base64,PHN2Zz4='),/Only JPG/);
});
