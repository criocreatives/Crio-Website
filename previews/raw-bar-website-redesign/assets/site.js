/* RawBar concept preview — no live booking, payment, or order submission */
(()=>{'use strict';
const root=document.documentElement;
const navToggle=document.querySelector('[data-menu-toggle]');
const nav=document.querySelector('[data-mobile-nav]');
if(navToggle&&nav){
  const close=()=>{nav.classList.remove('open');navToggle.setAttribute('aria-expanded','false');nav.inert=true;document.body.style.overflow='';};
  navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);navToggle.setAttribute('aria-expanded',String(open));nav.inert=!open;document.body.style.overflow=open?'hidden':'';});
  nav.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>840)close()});close();
}
const filterButtons=document.querySelectorAll('[data-menu-filter]');
const menuGroups=document.querySelectorAll('[data-menu-group]');
if(filterButtons.length){
 const choose=(category)=>{filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.menuFilter===category)));menuGroups.forEach(g=>g.hidden=category!=='all'&&g.dataset.menuGroup!==category);};
 filterButtons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.menuFilter)));
 const hash=location.hash.slice(1);choose(['starters','mains','desserts','drinks'].includes(hash)?hash:'all');
 window.addEventListener('hashchange',()=>{const cat=location.hash.slice(1);if(['starters','mains','desserts','drinks'].includes(cat))choose(cat)});
}
const currency=n=>'J$'+Math.max(0,n).toLocaleString('en-JM',{maximumFractionDigits:0});
if(document.body.dataset.page==='ordering'){
 const products=[...document.querySelectorAll('[data-item-id]')];
 const inventory=new Map(products.map(n=>[n.dataset.itemId,{id:n.dataset.itemId,name:n.dataset.name,price:Number(n.dataset.price)}]));
 const bag=new Map();
 const list=document.getElementById('cart-items'),count=document.getElementById('cart-count'),total=document.getElementById('cart-total'),empty=document.getElementById('cart-empty'),floating=document.getElementById('floating-cart'),status=document.getElementById('cart-status');
 let mode='pickup';
 try{const saved=JSON.parse(sessionStorage.getItem('rawbar-concept-cart')||'{}');Object.entries(saved).forEach(([id,q])=>{if(inventory.has(id)&&Number.isInteger(q)&&q>0&&q<=99)bag.set(id,q)})}catch(e){}
 function render(){
  if(!list)return;
  list.replaceChildren();let n=0,sum=0;
  for(const [id,qty] of bag){
   const item=inventory.get(id);if(!item)continue;n+=qty;sum+=item.price*qty;
   const li=document.createElement('li');li.className='cart-item';
   const title=document.createElement('div');title.className='cart-item-title';
   const name=document.createElement('span');name.textContent=item.name;
   const cost=document.createElement('span');cost.textContent=currency(item.price*qty);title.append(name,cost);
   const bottom=document.createElement('div');bottom.className='cart-qty';
   const caption=document.createElement('span');caption.className='muted small';caption.textContent=currency(item.price)+' each';
   const stepper=document.createElement('div');stepper.className='stepper';
   for(const [txt,delta,desc] of [['−',-1,'Decrease'],['+',1,'Increase']]){
    const b=document.createElement('button');b.type='button';b.textContent=txt;b.setAttribute('aria-label',desc+' quantity of '+item.name);b.addEventListener('click',()=>change(id,delta));
    if(delta===-1)stepper.append(b);
    else {const q=document.createElement('span');q.textContent=qty;stepper.append(q,b);}
   }bottom.append(caption,stepper);li.append(title,bottom);list.append(li);
  }
  count.textContent=n+' item'+(n===1?'':'s');
  total.textContent=currency(sum);
  empty.hidden=n>0;
  floating.hidden=n===0;
  floating.querySelector('span').textContent='View cart · '+n+' item'+(n===1?'':'s')+' · '+currency(sum);
  try{sessionStorage.setItem('rawbar-concept-cart',JSON.stringify(Object.fromEntries(bag)))}catch(e){}
 }
 function change(id,delta){const qty=Math.max(0,Math.min(99,(bag.get(id)||0)+delta));if(qty===0)bag.delete(id);else bag.set(id,qty);status.hidden=true;render()}
 products.forEach(p=>p.querySelector('button[data-add]')?.addEventListener('click',()=>{change(p.dataset.itemId,1);p.querySelector('button[data-add]').textContent='Added ✓';setTimeout(()=>{const b=p.querySelector('button[data-add]');if(b)b.textContent='Add +'},900)}));
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));document.getElementById('service-note').textContent=mode==='pickup'?'Pickup · 90A Barbican Road':'Delivery · Demo only';status.hidden=true;}));
 document.getElementById('demo-checkout')?.addEventListener('click',()=>{status.hidden=false;status.textContent=bag.size?'No order or payment was placed.':'Add an item to the demo cart before reviewing checkout.';});
 floating?.addEventListener('click',()=>document.getElementById('cart-panel')?.scrollIntoView({behavior:'smooth'}));
 const requested=new URLSearchParams(location.search).get('item');
 if(requested&&inventory.has(requested)&&!bag.has(requested))change(requested,1);
 render();
}
if(document.body.dataset.page==='reservations'){
 const dateInput=document.getElementById('reserve-date');const partyInput=document.getElementById('party-size');
 const dateLabel=document.getElementById('summary-date'),partyLabel=document.getElementById('summary-party'),timeLabel=document.getElementById('summary-time'),seatLabel=document.getElementById('summary-seat');
 const result=document.getElementById('booking-result'),form=document.getElementById('booking-form');
 const today=new Date();const localDate=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
 dateInput.min=localDate;dateInput.value=localDate;
 let selection={time:'7:00 PM',seat:'Dining room'};
 const dateFmt=value=>{const [y,m,d]=value.split('-').map(Number);return new Intl.DateTimeFormat('en-JM',{month:'short',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d,12))};
 function refresh(){dateLabel.textContent=dateInput.value?dateFmt(dateInput.value):'Choose a date';partyLabel.textContent=partyInput.value+' guest'+(Number(partyInput.value)===1?'':'s');timeLabel.textContent=selection.time;seatLabel.textContent=selection.seat;result.hidden=true;}
 dateInput.addEventListener('change',refresh);partyInput.addEventListener('change',refresh);
 for(const attr of ['time','seat']){
   document.querySelectorAll('[data-choice-'+attr+']').forEach(button=>{
      button.addEventListener('click',()=>{selection[attr]=button.dataset['choice'+attr[0].toUpperCase()+attr.slice(1)];document.querySelectorAll('[data-choice-'+attr+']').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));refresh()});
   });
 }
 form.addEventListener('submit',e=>{e.preventDefault();if(!dateInput.value||dateInput.value<dateInput.min){dateInput.focus();return}refresh();result.hidden=false;result.innerHTML='<h3>Preview request prepared</h3><p>'+dateFmt(dateInput.value)+' · '+partyInput.value+' guests · '+selection.time+' · '+selection.seat+'. This is a UI demonstration only: no reservation has been made. Use the live booking link to check availability.</p>';result.scrollIntoView({behavior:'smooth',block:'nearest'});});
 refresh();
}
})();