(()=>{'use strict';const f=document.getElementById('venue-form');if(!f)return;const date=f.elements.namedItem('date'),n=new Date();date.min=new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10);
f.addEventListener('submit',e=>{e.preventDefault();if(!f.reportValidity())return;
const d=new FormData(f),v=k=>String(d.get(k)||'').trim();
const body=['Name: '+v('name'),'Email: '+v('email'),'Occasion: '+v('occasion'),'Preferred date: '+(v('date')||'To discuss'),'Guests: '+(v('guests')||'To discuss'),'Phone: '+(v('phone')||'Not supplied'),'','Details:',v('details')||'To discuss'].join('\n');
const uri='mailto:info@rawbarja.com?subject='+encodeURIComponent('RawBar venue enquiry — '+v('occasion'))+'&body='+encodeURIComponent(body);
document.getElementById('enquiry-help').textContent='Review and send the prepared draft in your email app.';location.href=uri;});
})();