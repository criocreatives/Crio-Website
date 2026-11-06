/* Crio project presentation - shared full-screen viewer and keyboard support. */
(() => {
  const shots = Array.from(document.querySelectorAll('.gallery .shot'));
  const dialog=document.getElementById('lightbox');
  const viewer=document.getElementById('lightbox-image');
  const title=document.getElementById('lightbox-title');
  const counter=document.getElementById('lightbox-counter');
  const close=document.getElementById('lightbox-close');
  let index=0, opener=null;
  function present(n){
    index=(n+shots.length)%shots.length;
    const source=shots[index].querySelector('img');
    viewer.src=source.src;viewer.alt=source.alt;
    title.textContent=source.alt;
    counter.textContent=String(index+1).padStart(2,'0')+' / '+shots.length;
  }
  function open(n){
    opener=document.activeElement;
    present(n);
    dialog.hidden=false;
    dialog.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    close.focus();
  }
  function dismiss(){
    dialog.hidden=true;
    dialog.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    viewer.removeAttribute('src');
    if(opener&&typeof opener.focus==='function')opener.focus();
  }
  shots.forEach((shot,i)=>{
    shot.addEventListener('click',()=>open(i));
    shot.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();open(i);}
    });
  });
  document.getElementById('hero-open').addEventListener('click',()=>open(0));
  document.getElementById('lightbox-prev').addEventListener('click',()=>present(index-1));
  document.getElementById('lightbox-next').addEventListener('click',()=>present(index+1));
  close.addEventListener('click',dismiss);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss()});
  document.addEventListener('keydown',e=>{
    if(dialog.hidden)return;
    if(e.key==='Escape'){e.preventDefault();dismiss();}
    else if(e.key==='ArrowLeft'){e.preventDefault();present(index-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();present(index+1);}
    else if(e.key==='Tab'){
      const focusable=[document.getElementById('lightbox-prev'),document.getElementById('lightbox-next'),close];
      const current=focusable.indexOf(document.activeElement);
      if(current!==-1){e.preventDefault();focusable[(current+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}
    }
  });
  document.getElementById('back-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
})();
