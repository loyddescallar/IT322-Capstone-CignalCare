const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const helper = require('../utils/privateChatAttachment');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const pdf = Buffer.from('%PDF-1.7\n...');

test('PDF and image file headers are validated, not MIME alone',()=>{
  assert.equal(helper.inspectAttachmentBytes(pdf,'application/pdf'),true);
  assert.equal(helper.inspectAttachmentBytes(Buffer.from('<script>alert(1)</script>'),'application/pdf'),false);
  assert.equal(helper.inspectAttachmentBytes(Buffer.from([137,80,78,71,13,10,26,10]),'image/png'),true);
  assert.equal(helper.inspectAttachmentBytes(pdf,'image/png'),false);
  assert.equal(helper.inspectAttachmentBytes(Buffer.from('RIFF0000WEBP'),'image/webp'),true);
});
test('private Cloudinary descriptors round trip and reject invalid IDs',()=>{
  const encoded=helper.encodePrivateAttachment({publicId:'cignalcare/chat/abc.pdf',resourceType:'raw',format:'pdf'});
  assert.deepEqual(helper.decodePrivateAttachment(encoded),{p:'cignalcare/chat/abc.pdf',r:'raw',f:'pdf'});
  assert.equal(helper.decodePrivateAttachment('not-private'),null);
  assert.throws(()=>helper.encodePrivateAttachment({publicId:'../x',resourceType:'raw',format:'pdf'}));
});
test('legacy external URLs must be from exact configured Cloudinary account',()=>{
  assert.ok(helper.validLegacyCloudinaryUrl('https://res.cloudinary.com/my-cloud/raw/upload/v1/chat.pdf','my-cloud'));
  for(const u of ['https://evil.test/x','http://res.cloudinary.com/my-cloud/raw/upload/test.pdf',
  'https://res.cloudinary.com/other/raw/upload/test.pdf','https://res.cloudinary.com.evil.test/my-cloud/raw/upload/x.pdf',
  'https://res.cloudinary.com/my-cloud/raw/fetch/test.pdf']) assert.equal(helper.validLegacyCloudinaryUrl(u,'my-cloud'),null);
});
test('Cloudinary downloads have maximum size and require trusted HTTPS host',async()=>{
  await assert.rejects(()=>helper.boundedFetch('http://api.cloudinary.com/x',{fetchImpl:async()=>{throw new Error('should not call')}}));
  await assert.rejects(()=>helper.boundedFetch('https://example.com/x',{fetchImpl:async()=>{throw new Error('should not call')}}));
  let called=0;
  const buffer=await helper.boundedFetch('https://api.cloudinary.com/v1_1/cloud/raw/download',{
    fetchImpl:async() => { called++;return {ok:true, headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(new Uint8Array(pdf));c.close();}})}; }
  });
  assert.equal(called,1);assert.deepEqual(buffer,pdf);
});
test('new chat uploads are authenticated and never persist secure_url',()=>{
  const code=read('utils/cloudinaryUpload.js');
  assert.match(code,/options\.type = 'authenticated'/);
  assert.match(code,/url: encodePrivateAttachment/);
  assert.match(code,/inspectAttachmentBytes\(signature, mimeType\)/);
});
test('message listing redacts previously public asset urls',()=>{
  const code=read('controllers/messageController.js');
  assert.match(code,/attachment: row\.attachment \? 'protected' : null/);
  assert.match(code,/attachment: savedMessage\.attachment \? 'protected' : null/);
  assert.match(code,/getTicketMessageAttachmentController/);
  assert.match(code,/WHERE id = \? AND ticket_id = \?/);
});
test('frontend uses authenticated message route for ALL attachments',()=>{
  const ui=fs.readFileSync(path.join(root,'../Cignal_Frontend/src/components/ChatAttachment.jsx'),'utf8');
  assert.match(ui,/attachments\/message\/\$\{encodeURIComponent\(messageId\)\}/);
  assert.doesNotMatch(ui,/isRemote \? getAttachmentUrl/);
  assert.match(ui,/responseType: 'blob'/);
});
test('existing routes and previous payment defense remain intact',()=>{
  const routes=read('routes/ticketRoutes.js');
  assert.match(routes, /getTicketAttachmentController/);
  assert.match(routes, /getTicketMessageAttachmentController/);
  assert.match(routes,/authRequired, createAbuseRateLimit\('attachmentRead'\), getTicketMessageAttachmentController/);
  const pay=read('controllers/loadRequestController.js');
  assert.match(pay,/validatePaidPaymentEvent/);
});

// Run the real controller in a dependency-injected Node VM so access control
// is verified without connecting to private databases or Cloudinary.
const vm = require('node:vm');
function controllerHarness({ attachment='https://res.cloudinary.com/my-cloud/raw/upload/v1/file.pdf',
  ownerId=91, uploadedBytes=pdf, remoteFailure=null }={}) {
  const code = read('controllers/messageController.js');
  const calls={ db:0, remote:0 };
  const privateHelpers={
    ...helper,
    boundedFetch:async() => {
      calls.remote++;
      if(remoteFailure) throw remoteFailure;
      return uploadedBytes;
    },
  };
  const fakePool = {query:async(sql)=>{
    calls.db++;
    if (/^SELECT attachment, attachment_type FROM ticket_messages WHERE id/.test(sql))
      return [[{attachment,attachment_type:'application/pdf'}]];
    return [[]];
  }};
  const mocks={
    '../config/db':fakePool,
    'node:fs':fs, fs,
    'node:path':path, path,
    cloudinary:{v2:{config:()=>{},utils:{private_download_url:()=> 'https://api.cloudinary.com/v1_1/my-cloud/raw/download'}}},
    '../middleware/uploadMessage':{uploadDir:'/tmp/cignalcare-files'},
    '../models/ticketModel':{getTicketById:async(id)=>({id,user_id:ownerId})},
    '../models/notificationModel':{createNotification:async()=>{},createAdminNotification:async()=>{}},
    '../utils/ownership':{isAdmin:req=>req.user.role==='admin',isSelf:(req,id)=>req.user.id===id},
    '../utils/cloudinaryUpload':{uploadLocalFileMaybe:async()=>{},deleteCloudinaryAssetMaybe:async()=>{},removeLocalFileQuietly:async()=>{},isUploadStorageError:()=>false},
    '../utils/privateChatAttachment':privateHelpers,
  };
  const mod={exports:{}};
  const wrapper=vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{
    Buffer,console,setTimeout,clearTimeout,AbortController,
    process:{env:{...process.env,CLOUDINARY_CLOUD_NAME:'my-cloud'}},
  });
  wrapper(k=>{
    if(Object.hasOwn(mocks,k)) return mocks[k];
    throw new Error('Unexpected dependency '+k);
  },mod,mod.exports);
  const run=async(userId,role='user')=>{
    const req={params:{id:'14',messageId:'99'},user:{id:userId,role}};
    const res={statusCode:200,headers:{},
      status(n){this.statusCode=n;return this;},
      json(x){this.body=x;return this;},
      setHeader(k,v){this.headers[k]=v;},
      send(x){this.body=x;return this;},
    };
    await mod.exports.getTicketMessageAttachmentController(req,res);
    return res;
  };
  return {run,calls};
}
test('subscriber cannot download another subscriber attachment without ticket authorization',async()=>{
  const h=controllerHarness();
  const result=await h.run(92);
  assert.equal(result.statusCode,403);
  assert.equal(h.calls.db,0);
  assert.equal(h.calls.remote,0);
});
test('ticket owner and admin can read valid PDF through authenticated endpoint',async()=>{
  for (const [id,role] of [[91,'user'],[35,'admin']]) {
    const h=controllerHarness();
    const res=await h.run(id,role);
    assert.equal(res.statusCode,200);
    assert.equal(res.headers['Content-Type'],'application/pdf');
    assert.equal(res.headers['Cache-Control'],'private, no-store');
    assert.deepEqual(Buffer.from(res.body),pdf);
    assert.equal(h.calls.remote,1);
  }
});
test('other-host legacy file and blocked Cloudinary PDF fail without blank PDF',async()=>{
  const spoof=controllerHarness({attachment:'https://evil.example.com/file.pdf'});
  const denied=await spoof.run(91);
  assert.equal(denied.statusCode,404);
  assert.equal(spoof.calls.remote,0);
  const providerError=Object.assign(new Error('blocked'),{statusCode:424});
  const blocked=controllerHarness({remoteFailure:providerError});
  const res=await blocked.run(91);
  assert.equal(res.statusCode,424);
  assert.match(res.body.error,/Cloudinary/i);
});
test('server rejects a mislabeled PDF returned by provider',async()=>{
  const h=controllerHarness({uploadedBytes:Buffer.from('<!doctype html>')});
  const res=await h.run(91);
  assert.equal(res.statusCode,502);
  assert.match(res.body.error,/does not match/);
});
