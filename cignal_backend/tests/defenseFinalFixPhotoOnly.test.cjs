'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const backend = path.resolve(__dirname, '..');
const frontend = path.resolve(backend, '../Cignal_Frontend/src');
const getCode = file => fs.readFileSync(path.join(backend,file),'utf8');

function loadMiddleware() {
  const fakeMulter = options => ({options});
  fakeMulter.diskStorage = config => config;
  const moduleObj = {exports:{}};
  const dirname = path.join(backend,'middleware');
  const code = getCode('middleware/uploadMessage.js');
  const wrap = vm.runInNewContext('(function(require,module,exports,__dirname) {'+code+'\n})');
  wrap(id=> id==='multer'?fakeMulter:require(id),moduleObj,moduleObj.exports,dirname);
  return moduleObj.exports;
}

function fileAccepted(filter, mime, filename) {
  let result = null;
  filter(null,{mimetype:mime,originalname:filename},(err,accepted)=>{result={err,accepted};});
  return result;
}

test('upload middleware allows only matching JPG/PNG/WEBP photo pairs',()=>{
  const middleware = loadMiddleware();
  const filter = middleware.options.fileFilter;
  for(const [mime,name] of [['image/jpeg','photo.jpg'],['image/jpeg','photo.JPEG'],['image/png','screen.png'],['image/webp','signal.webp']]){
    const r = fileAccepted(filter,mime,name);
    assert.equal(r.err,null, `${name} rejected`);
    assert.equal(r.accepted,true);
  }
  assert.equal(middleware.options.limits.fileSize,5*1024*1024);
});

test('server rejects PDFs, GIF, SVG, other files, and MIME/extension mismatches',()=>{
  const filter = loadMiddleware().options.fileFilter;
  for(const [mime,name] of [
    ['application/pdf','invoice.pdf'],['image/gif','animation.gif'],
    ['image/svg+xml','vector.svg'],['text/plain','notes.txt'],
    ['image/png','wrong.jpg'],['image/jpeg','wrong.webp'],
    ['image/png','fake.pdf'],['application/pdf','fake.jpg'],
  ]){
    const result=fileAccepted(filter,mime,name);
    assert.ok(result.err instanceof Error || Boolean(result.err), `${name} erroneously accepted`);
    assert.match(String(result.err?.message),/Only JPG, PNG, or WEBP photo attachments are allowed/);
  }
});

test('frontend validator rejects nonphotos, mismatched names and files over 5 MB', async()=>{
  const code=fs.readFileSync(path.join(frontend,'utils/chatUtils.js'),'utf8');
  // ESM via data: URL bypasses package/module assumptions, no browser globals invoked.
  const frontendModule = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  for(const [type,name] of [['image/jpeg','photo.JPG'],['image/png','snap.png'],['image/webp','view.webp']]){
    assert.equal(frontendModule.validateChatAttachment({type,name,size:1024}),'');
  }
  for(const [type,name,size] of [
    ['application/pdf','docs.pdf',1024],['image/gif','meme.gif',1024],
    ['image/svg+xml','evil.svg',1024],['image/png','fake.jpg',1024],
    ['image/jpeg','fake.pdf',1024],['image/jpeg','photo.jpg',5*1024*1024+1],
    ['image/png','empty.png',0],
  ]){
    assert.ok(frontendModule.validateChatAttachment({type,name,size}), `${name} incorrectly accepted`);
  }
});

test('user and admin chats expose photo-only pickers and validation',()=>{
  for(const rel of ['pages/user/UserChat.jsx','pages/admin/AdminChat.jsx']){
    const code=fs.readFileSync(path.join(frontend,rel),'utf8');
    assert.match(code,/accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(code,/aria-label="Attach a photo"/);
    assert.match(code,/validateChatAttachment\(selectedFile\)/);
  }
});

test('support ticket prefilled image is validated before ticket creation',()=>{
  const code=fs.readFileSync(path.join(frontend,'pages/user/UserReportProblem.jsx'),'utf8');
  assert.match(code,/validateChatAttachment\(attachedPhoto\)/);
  assert.ok(code.indexOf('validateChatAttachment(attachedPhoto)') < code.indexOf('ticketApi.createTicket('));
});

function loadUploader(env={}) {
  let called=0;
  let options=null;
  const mockCloudinary={
    config:()=>{},
    uploader:{upload:async(_path,o)=>{
      called++; options=o;
      return {public_id:'cignalcare/chat/id123',resource_type:'image',format:'png',bytes:100};
    }},
  };
  const moduleObj={exports:{}};
  const code=getCode('utils/cloudinaryUpload.js');
  const wrap=vm.runInNewContext('(function(require,module,exports,process,__dirname,console) {'+code+'\n})', { Buffer });
  const localRequire=(id)=>{
    if(id==='cloudinary') return {v2:mockCloudinary};
    if(id==='./privateChatAttachment')return require(path.join(backend,'utils/privateChatAttachment.js'));
    return require(id);
  };
  wrap(localRequire,moduleObj,moduleObj.exports,{env},path.join(backend,'utils'),{warn:()=>{},error:()=>{},log:()=>{}});
  return {upload:moduleObj.exports.uploadLocalFileMaybe,getCalled:()=>called,getOptions:()=>options};
}

function tempfile(contents) {
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'cignal-photo-'));
  const filePath=path.join(tempDir,'uploaded.data');
  fs.writeFileSync(filePath,contents);
  return {tempDir,filePath};
}
function cleanup(tempDir){fs.rmSync(tempDir,{recursive:true,force:true});}

// A PNG signature suffices for signature validation; no file decoding runs in this unit.
const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);

test('Cloudinary upload rejects PDFs/GIFs before provider call and removes temporary file',async()=>{
  const uploader=loadUploader({NODE_ENV:'production',CLOUDINARY_CLOUD_NAME:'testcloud',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'secret'});
  for(const [mime,filename,bytes] of [
    ['application/pdf','proof.pdf',Buffer.from('%PDF-1.7')],
    ['image/gif','motion.gif',Buffer.from('GIF89a...')],
    ['image/png','wrong.jpg',png],
  ]){
    const {tempDir,filePath}=tempfile(bytes);
    try {
      await assert.rejects(()=>uploader.upload({path:filePath,originalname:filename,filename:'temp',mimetype:mime},'cignalcare/chat'),/Only JPG, PNG, or WEBP/);
      assert.equal(fs.existsSync(filePath),false);
    }finally{cleanup(tempDir)}
  }
  assert.equal(uploader.getCalled(),0);
});

test('Cloudinary upload verifies image signature before provider call',async()=>{
  const uploader=loadUploader({NODE_ENV:'production',CLOUDINARY_CLOUD_NAME:'testcloud',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'secret'});
  const {tempDir,filePath}=tempfile(Buffer.from('%PDF-1.7'));
  try{
    await assert.rejects(()=>uploader.upload({path:filePath,originalname:'bad.png',filename:'temp',mimetype:'image/png'}),/Invalid attachment contents/);
    assert.equal(uploader.getCalled(),0);
    assert.equal(fs.existsSync(filePath),false);
  }finally{cleanup(tempDir)}
});

test('valid photo is uploaded as a private Cloudinary image and not a raw file',async()=>{
  const uploader=loadUploader({NODE_ENV:'production',CLOUDINARY_CLOUD_NAME:'testcloud',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'secret'});
  const {tempDir,filePath}=tempfile(png);
  try{
    const result=await uploader.upload({path:filePath,originalname:'image.png',filename:'temp',mimetype:'image/png'});
    assert.equal(uploader.getCalled(),1);
    assert.equal(uploader.getOptions().type,'authenticated');
    assert.equal(uploader.getOptions().resource_type,'image');
    assert.equal(result.storage,'cloudinary');
    assert.match(result.url,/^cld-auth-v1:/);
    assert.equal(fs.existsSync(filePath),false);
  }finally{cleanup(tempDir)}
});

test('old PDF attachments remain readable through the previously protected download code',()=>{
  const helper=require(path.join(backend,'utils/privateChatAttachment.js'));
  assert.equal(helper.MIMES['application/pdf'],'pdf');
  assert.ok(helper.inspectAttachmentBytes(Buffer.from('%PDF-1.7'),'application/pdf'));
  const controller=getCode('controllers/messageController.js');
  assert.match(controller,/getTicketMessageAttachmentController/);
  assert.match(controller,/canAccessTicket\(req, ticket\)/);
  assert.match(controller,/WHERE id = \? AND ticket_id = \?/);
});
