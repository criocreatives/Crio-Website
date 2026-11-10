/* Crio Tools — browser-only image utilities. No uploads or third-party libraries. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const tool = document.body.dataset.tool;
  const requestedMode = new URLSearchParams(location.search).get('mode');
  let mode = ['resize','convert','optimize'].includes(requestedMode)
    ? requestedMode
    : document.body.dataset.mode || 'convert';
  const fmtNames = {jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  const extNames = {jpeg:'jpg',png:'png',webp:'webp'};
  const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(1)+' MB';
  const niceName = s => s.replace(/\.[^.]+$/, '').replace(/[\/\\:*?"<>|]/g,'_');
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const status = $('#status');
  const showStatus = (msg,error=false) => { if(status){status.textContent=msg;status.dataset.error=String(error);} };
  const filename = (name,suffix,fmt) => niceName(name)+'-'+suffix+'.'+extNames[fmt];
  // File extensions determine whether the user's chosen export format differs.
  // Treat both .jpg and .jpeg as JPEG, and use MIME when no extension is present.
  const sourceFormat = f => {
    const ext = f.name.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase();
    return ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext || Object.keys(fmtNames).find(fmt => fmtNames[fmt] === f.type) || null;
  };
  // All image tools can retain the source basename for cross-format exports.
  const outputFilename = (f,suffix,fmt) =>
    $('#keep-original-names')?.checked && sourceFormat(f) !== fmt
      ? niceName(f.name)+'.'+extNames[fmt]
      : filename(f.name,suffix,fmt);
  const fileList = [];
  const allowed = f => f && (/^image\/(png|jpeg|webp)$/.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name));
  const base = $('.tool-app');
  const drop = $('#dropzone');
  const picker = $('#files');
  const list = $('#file-list');
  const runBtn = $('#run');
  const clearBtn = $('#clear');
  const browserSupported = !!document.createElement('canvas').toBlob;

  function addFiles(items) {
    let added=0, rejected=0;
    for(const f of Array.from(items||[])){
      if (!allowed(f)){rejected++;continue;}
      if(fileList.some(x => x.name===f.name && x.size===f.size && x.lastModified===f.lastModified))continue;
      fileList.push(f);added++;
    }
    renderFiles();
    if(rejected)showStatus(rejected+' unsupported file'+(rejected===1?' was':'s were')+' skipped. Use PNG, JPEG or WebP.',true);
    else if(added)showStatus('Added '+added+' image'+(added===1?'':'s')+'. Files remain on your device.');
  }
  function renderFiles(){
    if(!list)return;
    list.replaceChildren();
    fileList.forEach((f,i)=>{
      const li=document.createElement('li');li.className='file-row';
      const info=document.createElement('div');info.className='file-info';
      const name=document.createElement('strong');name.textContent=f.name;
      const sub=document.createElement('span');sub.textContent=bytes(f.size);
      info.append(name,sub);
      const remove=document.createElement('button');remove.type='button';remove.className='remove-file';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+f.name);
      remove.addEventListener('click',()=>{fileList.splice(i,1);renderFiles();});
      li.append(info,remove);list.append(li);
    });
    if(base)base.classList.toggle('has-files',fileList.length>0);
    if(runBtn)runBtn.disabled=!fileList.length;
    if(clearBtn)clearBtn.disabled=!fileList.length;
    const count=$('#file-count');if(count)count.textContent=fileList.length+' image'+(fileList.length===1?'':'s')+' selected';
    syncFormatControls();
  }
  if(picker)picker.addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});
  if(drop){
    drop.addEventListener('click',e=>{if(!e.target.closest('label,button,a,input'))picker?.click();});
    drop.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && !e.target.closest('input,button')){e.preventDefault();picker?.click();}});
    for(const ev of ['dragenter','dragover'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging');});
    for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging');});
    drop.addEventListener('drop',e=>addFiles(e.dataTransfer?.files));
  }
  clearBtn?.addEventListener('click',()=>{fileList.length=0;renderFiles();showStatus('Selection cleared.');});

  async function withImage(file,cb){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{
        const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(new Error('Cannot decode '+file.name));x.src=url;
      });
      return await cb(img);
    }finally{URL.revokeObjectURL(url);}
  }
  function canvas(w,h){
    w=Math.round(w);h=Math.round(h);
    if(!w||!h||w>32767||h>32767||w*h>80000000)throw new Error('Image dimensions exceed your browser’s safe canvas limit.');
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  }
  function blobFromCanvas(c,fmt,quality){
    return new Promise((resolve,reject)=>c.toBlob(b=>!b?reject(new Error('This browser could not export this image.')):(b.type!==fmtNames[fmt]?reject(new Error('This browser cannot export '+fmt.toUpperCase()+' format.')):resolve(b)),fmtNames[fmt],quality));
  }
  function jpegBackground(ctx,w,h,color){
    ctx.fillStyle=color||'#ffffff';ctx.fillRect(0,0,w,h);
  }
  function download(b,name){
    const url=URL.createObjectURL(b),a=document.createElement('a');
    a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  const quality = () => clamp(Number($('#quality')?.value||85),10,100)/100;
  const outputFormat = () => $('#format')?.value || 'jpeg';
  const bg = () => $('#background')?.value||'#ffffff';

  function syncFormatControls(){
    if(!$('#format'))return;
    const format=$('#format');
    if(tool==='image-workbench'){
      const png=format.querySelector('option[value="png"]');
      const original=format.querySelector('option[value="original"]');
      if(png)png.hidden=mode==='optimize';
      if(original)original.hidden=mode!=='resize';
      if((mode==='optimize'&&format.value==='png')||(mode!=='resize'&&format.value==='original'))format.value='webp';
    }
    const fmt=format.value;
    const originalFormats=fmt==='original'?fileList.map(sourceFormat):[];
    const supportsQuality=fmt==='jpeg'||fmt==='webp'||(fmt==='original'&&originalFormats.some(source=>source==='jpeg'||source==='webp'));
    if($('#quality-control'))$('#quality-control').hidden=!supportsQuality;
    const needsJpegBackground=fmt==='jpeg'||(fmt==='original'&&originalFormats.includes('jpeg'));
    if($('#background-control'))$('#background-control').hidden=!needsJpegBackground;
  }
  function syncMode(next=mode){
    if(!['resize','convert','optimize'].includes(next))next='resize';
    mode=next;
    document.body.dataset.mode=mode;
    document.querySelectorAll('[data-mode]').forEach(tab=>{
      const active=tab.dataset.mode===mode;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
    });
    document.querySelectorAll('[data-mode-panel]').forEach(panel=>{panel.hidden=panel.dataset.modePanel!==mode;});
    const panel=$('#image-settings');if(panel)panel.setAttribute('aria-labelledby','tab-'+mode);
    if(runBtn)runBtn.textContent=mode==='resize'?'Resize & download':mode==='optimize'?'Optimize & download':'Convert & download';
    $('#output-summary')?.setAttribute('hidden','');
    syncResizeMode();syncFormatControls();
  }
  if(tool==='image-workbench'){
    document.querySelectorAll('[role="tab"][data-mode]').forEach(tab=>{
      tab.addEventListener('click',()=>syncMode(tab.dataset.mode));
      tab.addEventListener('keydown',event=>{
        const tabs=Array.from(document.querySelectorAll('[role="tab"][data-mode]'));
        const index=tabs.indexOf(tab);
        const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:-1;
        if(next>=0){event.preventDefault();tabs[next].focus();syncMode(tabs[next].dataset.mode);}
      });
    });
    syncMode(mode);
  }else syncFormatControls();
  $('#format')?.addEventListener('change',syncFormatControls);

  // Lightroom-style longest-side resizing: portrait, landscape, and square
  // images share a single maximum dimension without cropping or distortion.
  function resizeDimensions(originalW,originalH,{mode,maxW,maxH,longest,ratio,allowUp}){
    let w=originalW,h=originalH;
    if(mode==='longest'){
      if(!Number.isInteger(longest)||longest<1||longest>32767){
        throw new Error('Longest side must be between 1 and 32767 pixels.');
      }
      const scale=longest/Math.max(w,h);
      const factor=allowUp?scale:Math.min(scale,1);
      return {
        width:Math.max(1,Math.round(w*factor)),
        height:Math.max(1,Math.round(h*factor))
      };
    }
    if(ratio){
      const sc=Math.min(maxW>0?maxW/w:Infinity,maxH>0?maxH/h:Infinity,allowUp?Infinity:1);
      const scale=Number.isFinite(sc)?sc:1;
      w=Math.max(1,Math.round(w*scale));
      h=Math.max(1,Math.round(h*scale));
    }else{
      w=maxW||w;h=maxH||h;
      if(!allowUp){w=Math.min(w,originalW);h=Math.min(h,originalH);}
    }
    return {width:w,height:h};
  }
  function syncResizeMode(){
    if(tool!=='image-workbench'||mode!=='resize')return;
    const longest=$('#resize-mode')?.value==='longest';
    if($('#resize-bounds'))$('#resize-bounds').hidden=longest;
    if($('#resize-longest'))$('#resize-longest').hidden=!longest;
    if($('#resize-ratio'))$('#resize-ratio').hidden=longest;
  }
  if(tool==='image-workbench'){
    $('#resize-mode')?.addEventListener('change',syncResizeMode);
    syncResizeMode();
  }
  async function processFile(f){
    if(tool==='image-workbench'){
      return withImage(f,async img=>{
        const dimensions=mode==='resize'?resizeDimensions(img.naturalWidth,img.naturalHeight,{
          mode:$('#resize-mode')?.value||'bounds',
          maxW:Math.round(Number($('#width')?.value||0)),
          maxH:Math.round(Number($('#height')?.value||0)),
          longest:Number($('#longest-side')?.value),
          ratio:!!$('#keep-ratio')?.checked,
          allowUp:!!$('#upscale')?.checked
        }):{width:img.naturalWidth,height:img.naturalHeight};
        const {width,height}=dimensions;
        const selected=outputFormat();
        const fmt=selected==='original'?(sourceFormat(f)||'jpeg'):selected;
        const c=canvas(width,height),ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
        if(fmt==='jpeg')jpegBackground(ctx,c.width,c.height,bg());
        ctx.drawImage(img,0,0,width,height);
        const b=await blobFromCanvas(c,fmt,quality());
        const suffix=mode==='resize'?width+'x'+height:mode==='optimize'?'optimized':'converted';
        return {name:outputFilename(f,suffix,fmt),blob:b,originalSize:f.size};
      });
    }
    if(tool==='watermarker'){
      const logo=$('#mark')?.files?.[0];if(!logo)throw new Error('Choose your watermark logo first.');
      return withImage(f,async img=>withImage(logo,async mark=>{
        const w=img.naturalWidth,h=img.naturalHeight,c=canvas(w,h),ctx=c.getContext('2d');
        const fmt=outputFormat();
        if(fmt==='jpeg')jpegBackground(ctx,w,h,bg());
        ctx.drawImage(img,0,0);
        const scale=clamp(Number($('#mark-scale')?.value||20),2,80)/100;
        const opacity=clamp(Number($('#mark-opacity')?.value||70),1,100)/100;
        const space=clamp(Number($('#mark-margin')?.value||3),0,20)/100*Math.min(w,h);
        const mw=Math.min(w*scale,w-space*2),mh=mw*mark.naturalHeight/mark.naturalWidth;
        let x=space,y=space;
        const pos=$('#mark-position')?.value||'bottom-right';
        if(pos.includes('right'))x=w-mw-space;
        if(pos.includes('bottom'))y=h-mh-space;
        if(pos==='center'){x=(w-mw)/2;y=(h-mh)/2;}
        ctx.globalAlpha=opacity;ctx.drawImage(mark,x,y,mw,mh);ctx.globalAlpha=1;
        return {name:outputFilename(f,'watermarked',fmt),blob:await blobFromCanvas(c,fmt,quality()),originalSize:f.size};
      }));
    }
    throw new Error('Unknown image operation.');
  }

  // ZIP 2.0 (STORE): images are already compressed, so no dependency is needed.
  const crcTable=(()=>{const arr=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;arr[n]=c>>>0;}return arr;})();
  const crc32 = data => {let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const encoder = new TextEncoder();
  function zipFiles(results){
    const chunks=[],central=[];let offset=0;
    const write=(dv,off,num,size)=>size===2?dv.setUint16(off,num,true):dv.setUint32(off,num,true);
    for(const r of results){
      const name=encoder.encode(r.name),data=r.data,crc=crc32(data);
      const local=new Uint8Array(30+name.length),d=new DataView(local.buffer);
      write(d,0,0x04034b50,4);write(d,4,20,2);write(d,6,0x0800,2);write(d,8,0,2);
      write(d,14,crc,4);write(d,18,data.length,4);write(d,22,data.length,4);write(d,26,name.length,2);local.set(name,30);
      chunks.push(local,data);
      const cd=new Uint8Array(46+name.length),v=new DataView(cd.buffer);
      write(v,0,0x02014b50,4);write(v,4,20,2);write(v,6,20,2);write(v,8,0x0800,2);
      write(v,16,crc,4);write(v,20,data.length,4);write(v,24,data.length,4);
      write(v,28,name.length,2);write(v,42,offset,4);cd.set(name,46);central.push(cd);
      offset+=local.length+data.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);
    const centralLen=central.reduce((n,x)=>n+x.length,0);
    write(v,0,0x06054b50,4);write(v,8,results.length,2);write(v,10,results.length,2);
    write(v,12,centralLen,4);write(v,16,offset,4);
    return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
  function safeUniqueNames(results){
    const used=new Set();
    for(const r of results){
      const original=r.name;let candidate=original,n=2;
      while(used.has(candidate.toLowerCase()))candidate=original.replace(/(\.[^.]+)$/,'-'+(n++)+'$1');
      used.add(candidate.toLowerCase());r.name=candidate;
    }
  }
  // One image remains a direct download. For batches, default to the existing
  // ZIP behavior; users can opt into separate image downloads per output.
  const zipEnabled = () => $('#zip-files')?.checked !== false;
  async function downloadResults(results){
    if(results.length===1){
      download(results[0].blob,results[0].name);
      return 'Started 1 image download.';
    }
    if(zipEnabled()){
      const data=[];let size=0;
      for(const r of results){
        const u=new Uint8Array(await r.blob.arrayBuffer());
        size+=u.length;
        if(size>1500000000)throw new Error('Batch exceeds ZIP capacity. Process fewer files at a time.');
        data.push({name:r.name,data:u});
      }
      download(zipFiles(data),'crio-'+(tool==='image-workbench'?mode:tool)+'-'+results.length+'-images.zip');
      return 'Started ZIP download containing '+results.length+' images.';
    }
    for(let i=0;i<results.length;i++){
      download(results[i].blob,results[i].name);
      // Give browsers a chance to register each individual download.
      if(i<results.length-1)await new Promise(resolve=>setTimeout(resolve,150));
    }
    return 'Started '+results.length+' individual downloads. If prompted, allow multiple downloads in your browser.';
  }
  async function run(){
    if(!fileList.length||!browserSupported)return;
    runBtn.disabled=true;runBtn.textContent='Processing…';
    const results=[];let errors=[];
    $('#output-summary')?.setAttribute('hidden','');
    try{
      for(let i=0;i<fileList.length;i++){
        showStatus('Processing '+(i+1)+' of '+fileList.length+' — '+fileList[i].name);
        try{const output=await processFile(fileList[i]);results.push(output);}
        catch(e){errors.push(fileList[i].name+': '+(e.message||String(e)));}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(!results.length)throw new Error(errors.join(' / ')||'Nothing could be processed.');
      safeUniqueNames(results);
      const message=await downloadResults(results);
      showStatus(message+(errors.length?' '+errors.length+' failed: '+errors.join(' / '):''),!!errors.length);
      if(tool==='image-workbench'&&mode==='optimize'){
        const summary=$('#output-summary');
        if(summary){
          summary.replaceChildren();
          const before=results.reduce((sum,r)=>sum+(r.originalSize||0),0),after=results.reduce((sum,r)=>sum+r.blob.size,0);
          const delta=before?((before-after)/before*100):0;
          const li=document.createElement('li');li.textContent=results.length+' image'+(results.length===1?'':'s');
          const detail=document.createElement('span');detail.textContent=bytes(before)+' → '+bytes(after)+' · '+(delta>=0?delta.toFixed(1)+'% smaller':Math.abs(delta).toFixed(1)+'% larger');
          li.append(detail);summary.append(li);summary.hidden=false;
        }
      }
    }catch(e){showStatus(e.message||'Conversion failed. Try a smaller image.',true);}
    finally{runBtn.disabled=!fileList.length;runBtn.textContent=tool==='image-workbench'?(mode==='resize'?'Resize & download':mode==='optimize'?'Optimize & download':'Convert & download'):'Process & download';}
  }
  if(['image-workbench','watermarker'].includes(tool))runBtn?.addEventListener('click',run);
  $('#quality')?.addEventListener('input',e=>{$('#quality-value').textContent=e.target.value+'%';});
  for(const id of ['mark-scale','mark-opacity']){
    $('#'+id)?.addEventListener('input',e=>{const el=$('#'+id+'-value');if(el)el.textContent=e.target.value+'%';});
  }

  if(!browserSupported)showStatus('This browser does not support image canvas exports. Update your browser.',true);
  renderFiles();
})();
