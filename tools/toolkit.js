/* Crio Tools — browser-only image utilities. No uploads or third-party libraries. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const tool = document.body.dataset.tool;
  const fmtNames = {jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  const extNames = {jpeg:'jpg',png:'png',webp:'webp'};
  const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(1)+' MB';
  const niceName = s => s.replace(/\.[^.]+$/, '').replace(/[\/\\:*?"<>|]/g,'_');
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const status = $('#status');
  const showStatus = (msg,error=false) => { if(status){status.textContent=msg;status.dataset.error=String(error);} };
  const filename = (name,suffix,fmt) => niceName(name)+'-'+suffix+'.'+extNames[fmt];
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
    if(rejected)showStatus(rejected+' unsupported file(s) skipped. Use PNG, JPEG or WebP.',true);
    else if(added)showStatus(added+' image(s) added. Files remain on your device.');
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

  const loading = async f => {
    const url=URL.createObjectURL(f);
    try {
      return await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error('Unable to read '+f.name));
        img.src=url;
      });
    } finally { /* caller revokes after its image has been drawn */ }
  };
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
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('This browser could not export this image.')),fmtNames[fmt],quality));
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
  async function processFile(f){
    if(tool==='converter'||tool==='compressor'){
      return withImage(f,async img=>{
        const fmt=outputFormat();
        const c=canvas(img.naturalWidth,img.naturalHeight),ctx=c.getContext('2d');
        if(fmt==='jpeg')jpegBackground(ctx,c.width,c.height,bg());
        ctx.drawImage(img,0,0);
        const b=await blobFromCanvas(c,fmt,quality());
        return {name:filename(f.name,tool==='converter'?'converted':'optimized',fmt),blob:b};
      });
    }
    if(tool==='resizer'){
      return withImage(f,async img=>{
        const maxW=Math.round(Number($('#width')?.value||0)),maxH=Math.round(Number($('#height')?.value||0));
        const ratio=!!$('#keep-ratio')?.checked;
        const allowUp=!!$('#upscale')?.checked;
        let w=img.naturalWidth,h=img.naturalHeight;
        if(ratio){
          const sc=Math.min(maxW>0?maxW/w:Infinity,maxH>0?maxH/h:Infinity,allowUp?Infinity:1);
          const s=Number.isFinite(sc)?sc:1;w=Math.max(1,Math.round(w*s));h=Math.max(1,Math.round(h*s));
        } else {
          w=maxW||w;h=maxH||h;
          if(!allowUp){w=Math.min(w,img.naturalWidth);h=Math.min(h,img.naturalHeight);}
        }
        const fmt=outputFormat()==='original' ? (f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpeg') : outputFormat();
        const c=canvas(w,h),ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
        if(fmt==='jpeg')jpegBackground(ctx,w,h,bg());
        ctx.drawImage(img,0,0,w,h);
        return {name:filename(f.name,w+'x'+h,fmt),blob:await blobFromCanvas(c,fmt,quality())};
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
        return {name:filename(f.name,'watermarked',fmt),blob:await blobFromCanvas(c,fmt,quality())};
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
  async function run(){
    if(!fileList.length||!browserSupported)return;
    runBtn.disabled=true;runBtn.textContent='Processing…';
    const results=[];let errors=[];
    try{
      for(let i=0;i<fileList.length;i++){
        showStatus('Processing '+(i+1)+' of '+fileList.length+' — '+fileList[i].name);
        try{const output=await processFile(fileList[i]);results.push(output);}
        catch(e){errors.push(fileList[i].name+': '+(e.message||String(e)));}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(!results.length)throw new Error(errors.join(' / ')||'Nothing could be processed.');
      safeUniqueNames(results);
      if(results.length===1)download(results[0].blob,results[0].name);
      else {
        const data=[];let size=0;
        for(const r of results){const u=new Uint8Array(await r.blob.arrayBuffer());size+=u.length;if(size>1500000000)throw new Error('Batch exceeds ZIP capacity. Process fewer files at a time.');data.push({name:r.name,data:u});}
        download(zipFiles(data),'crio-'+tool+'-'+results.length+'-images.zip');
      }
      showStatus('Downloaded '+results.length+' file'+(results.length===1?'':'s')+'.'+(errors.length?' '+errors.length+' failed: '+errors.join(' / '):''),!!errors.length);
    }catch(e){showStatus(e.message||'Conversion failed. Try a smaller image.',true);}
    finally{runBtn.disabled=!fileList.length;runBtn.textContent='Process & download';}
  }
  runBtn?.addEventListener('click',run);
  $('#quality')?.addEventListener('input',e=>{$('#quality-value').textContent=e.target.value+'%';});
  for(const id of ['mark-scale','mark-opacity']){
    $('#'+id)?.addEventListener('input',e=>{const el=$('#'+id+'-value');if(el)el.textContent=e.target.value+'%';});
  }

  // Palette extraction: downsample, quantize, filter near-duplicate clusters.
  if(tool==='palette'){
    const grid=$('#swatches');
    const copyColor=async value=>{
      try{await navigator.clipboard.writeText(value);showStatus('Copied '+value);}
      catch(e){showStatus('Colour: '+value);}
    };
    runBtn?.addEventListener('click',async()=>{
      if(!fileList.length)return;
      runBtn.disabled=true;grid.replaceChildren();
      try{
        await withImage(fileList[0],async img=>{
          const c=canvas(96,96),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,96,96);
          const data=ctx.getImageData(0,0,96,96).data,map=new Map();
          for(let p=0;p<data.length;p+=4){
            if(data[p+3]<160)continue;
            const key=[data[p]>>4,data[p+1]>>4,data[p+2]>>4].join(',');
            const old=map.get(key)||{n:0,r:0,g:0,b:0};
            old.n++;old.r+=data[p];old.g+=data[p+1];old.b+=data[p+2];map.set(key,old);
          }
          const candidates=[...map.values()].sort((a,b)=>b.n-a.n);
          const picked=[];
          for(const o of candidates){
            const rgb=[o.r/o.n,o.g/o.n,o.b/o.n].map(Math.round);
            if(picked.some(prev=>Math.hypot(...rgb.map((x,j)=>x-prev[j]))<50))continue;
            picked.push(rgb);if(picked.length===8)break;
          }
          if(!picked.length)throw new Error('No visible colours were detected.');
          for(const rgb of picked){
            const hex='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
            const b=document.createElement('button');b.type='button';b.className='swatch';b.style.setProperty('--swatch',hex);
            const dot=document.createElement('span');dot.className='swatch-chip';
            const label=document.createElement('strong');label.textContent=hex;
            const note=document.createElement('small');note.textContent='Copy HEX';
            b.append(dot,label,note);b.addEventListener('click',()=>copyColor(hex));grid.append(b);
          }
        });
        showStatus('Palette generated from '+fileList[0].name+'. Tap a colour to copy its HEX code.');
      }catch(e){showStatus(e.message,true);}
      finally{runBtn.disabled=!fileList.length;}
    });
  }

  // Image comparison: both source images are local object URLs.
  if(tool==='comparison'){
    let images={before:null,after:null};
    const inputs={before:$('#before-file'),after:$('#after-file')};
    const frame=$('#comparison-frame'),output=$('#comparison-controls');
    function refresh(){
      for(const key of ['before','after']){
        const el=$('#'+key+'-image');
        if(images[key]){el.src=images[key].url;}else{el.removeAttribute('src');}
      }
      const ready=!!(images.before&&images.after);
      frame.classList.toggle('ready',ready);output.hidden=!ready;
      if(ready){$('#compare-range').value=50;updateSplit(50);showStatus('Comparison ready. Drag the slider to inspect differences.');}
    }
    function updateSplit(v){$('#before-layer').style.width=v+'%';$('#compare-handle').style.left=v+'%';$('#compare-value').textContent=v+'%';}
    $('#compare-range')?.addEventListener('input',e=>updateSplit(e.target.value));
    for(const key of ['before','after'])inputs[key]?.addEventListener('change',e=>{
      const file=e.target.files[0];if(!file)return;
      if(!allowed(file)){showStatus('Use PNG, JPEG or WebP images.',true);return;}
      if(images[key])URL.revokeObjectURL(images[key].url);
      images[key]={file,url:URL.createObjectURL(file)};refresh();
    });
    $('#swap-images')?.addEventListener('click',()=>{
      [images.before,images.after]=[images.after,images.before];
      for(const key of ['before','after'])inputs[key].value='';refresh();
    });
    $('#comparison-download')?.addEventListener('click',async()=>{
      if(!images.before||!images.after)return;
      const btn=$('#comparison-download');btn.disabled=true;
      try{
        const sources=await Promise.all(['before','after'].map(key=>withImage(images[key].file,async img=>({w:img.naturalWidth,h:img.naturalHeight,file:images[key].file}))));
        const w=2400,h=Math.max(600,Math.min(1600,Math.round(1200*Math.max(sources[0].h/sources[0].w,sources[1].h/sources[1].w))));
        const c=canvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='#101010';ctx.fillRect(0,0,w,h);
        const files=[images.before.file,images.after.file];
        for(let i=0;i<2;i++)await withImage(files[i],async img=>{
          const s=Math.min((w/2)/img.naturalWidth,h/img.naturalHeight);
          const dw=img.naturalWidth*s,dh=img.naturalHeight*s;
          ctx.drawImage(img,i*w/2+(w/2-dw)/2,(h-dh)/2,dw,dh);
        });
        ctx.fillStyle='#ed1c24';ctx.fillRect(w/2-2,0,4,h);
        ctx.fillStyle='#fff';ctx.font='bold 27px Arial';ctx.fillText('BEFORE',28,45);ctx.fillText('AFTER',w/2+28,45);
        download(await blobFromCanvas(c,'jpeg',0.9),'crio-before-after.jpg');
        showStatus('Side-by-side comparison downloaded.');
      }catch(e){showStatus(e.message,true);}finally{btn.disabled=false;}
    });
  }

  if(!browserSupported)showStatus('This browser does not support image canvas exports. Update your browser.',true);
  renderFiles();
})();