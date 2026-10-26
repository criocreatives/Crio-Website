/* Crio Creatives | editorial presentation chrome.
   One floating header across all previews; retains each project's content and interactive components. */
(() => {
  // GA4 for Crio's dedicated client-preview property.
  if (window.location.hostname === 'criocreatives.com' && window.location.pathname.startsWith('/previews/')) {
    const ga4Id = 'G-L4VQ7CB9E3';
    if (!document.querySelector('script[data-crio-ga4="' + ga4Id + '"]')
        && !document.querySelector('script[src*="googletagmanager.com/gtag/js?id=' + ga4Id + '"]')) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', ga4Id);
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga4Id;
      tag.dataset.crioGa4 = ga4Id;
      document.head.appendChild(tag);
    }
  }

  const FONT = '"Century Gothic","Avenir Next",Avenir,Helvetica,Arial,sans-serif';
  const logoSrc = 'https://criocreatives.com/assets/logos/Crio%20Creatives%20Logo%20wide%20white.svg';
  function initialize() {
    const body = document.body;
    if (!body || body.classList.contains('crio-ed')) return;
    const slug = location.pathname.replace(/^\/previews(?:\/|$)/, '/').split('/').filter(Boolean)[0] || 'index';
    body.classList.add('crio-ed', 'crio-ed--' + slug);
    const originalHeader = [...document.querySelectorAll('header')].find(h => h.parentElement === body) || document.querySelector('.page > .top');
    const anchors = originalHeader ? [...originalHeader.querySelectorAll('a[href^="#"]')] : [];
    const seen = new Set();
    const detailLinks = anchors.map(a => {
      const href = a.getAttribute('href') || '';
      const label = (a.textContent || '').replace(/\s+/g,' ').trim();
      if (!/^#[a-z0-9-]+$/i.test(href) || !label || label.length > 20 || ['#top','#main'].includes(href) || seen.has(href)) return null;
      if (!document.getElementById(href.slice(1))) return null;
      seen.add(href);
      return {href,label};
    }).filter(Boolean).slice(0,4);
    const bar = document.createElement('header');
    bar.className = 'crio-ed-bar';
    bar.id = 'crio-presentation-header';
    const inner = document.createElement('div');
    inner.className = 'crio-ed-bar-inner';
    const logo = document.createElement('a');
    logo.className = 'crio-ed-wordmark';
    logo.href = 'https://criocreatives.com/';
    logo.setAttribute('aria-label','Crio Creatives website');
    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'Crio Creatives';
    const label = document.createElement('span');
    label.className = 'crio-ed-label';
    label.textContent = slug === 'index' ? 'Previews' : (slug === 'list' ? 'Preview directory' : 'Project preview');
    logo.append(img,label);
    const toggle = document.createElement('button');
    toggle.className = 'crio-ed-menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls','crio-presentation-nav');
    toggle.setAttribute('aria-expanded','false');
    toggle.textContent = 'Menu';
    const nav = document.createElement('nav');
    nav.id = 'crio-presentation-nav';
    nav.setAttribute('aria-label','Preview navigation');
    const appendLink = (href,label,cls) => {
      const a = document.createElement('a');
      a.href=href;
      a.textContent=label;
      if(cls)a.className=cls;
      nav.append(a);
    };
    for(const item of detailLinks) appendLink(item.href,item.label,'crio-ed-detail');
    if(slug!=='index')appendLink('https://criocreatives.com/previews/','Previews');
    if(slug!=='list')appendLink('https://criocreatives.com/previews/list/','All previews');
    appendLink('https://portfolio.criocreatives.com/','Portfolio');
    appendLink('https://criocreatives.com/#contact','Contact','crio-ed-contact');
    inner.append(logo,toggle,nav);
    bar.append(inner);
    const rule=document.createElement('div');
    rule.className='crio-ed-rule';
    const left=document.createElement('span');
    left.innerHTML=slug==='list' ? '<strong>Crio /</strong> All project previews' : '<strong>Crio /</strong> Selected project presentation';
    const right=document.createElement('span');
    right.textContent=(document.title || 'Project preview').replace(/\s*\|.*$/,'').replace(/\s+—\s+Crio Creatives.*$/,'');
    rule.append(left,right);
    body.prepend(bar,rule);
    toggle.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(open));
      toggle.textContent=open?'Close':'Menu';
      bar.classList.toggle('menu-open',open);
    });
    nav.addEventListener('click',e=>{
      if(e.target.closest('a')){
        nav.classList.remove('open');
        bar.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded','false');
        toggle.textContent='Menu';
      }
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&nav.classList.contains('open')){
        nav.classList.remove('open');
        bar.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded','false');
        toggle.textContent='Menu';
        toggle.focus();
      }
    });
    let frame=0;
    const morph=()=>{
      frame=0;
      const viewport=window.innerWidth;
      const mobile=viewport<=900, compact=viewport<=520;
      const progress=Math.min(1,Math.max(0,window.scrollY/(mobile?110:180)));
      const eased=progress*progress*(3-2*progress);
      const pageInset=compact?16:mobile?20:40;
      const margin=Math.max(0,(viewport-Math.min(1360,Math.max(0,viewport-pageInset*2)))/2);
      const side=compact?6:mobile?8:Math.max(12,margin-32);
      const mix=(start,end)=>start+(end-start)*eased;
      const vars={
        '--morph-top':mix(mobile?24:50,0),
        '--morph-left':mix(side,0),
        '--morph-right':mix(side,0),
        '--morph-radius':mix(mobile?16:18,0),
        '--morph-pad-y':mix(mobile?8:9,4),
        '--morph-logo-w':mix(mobile?166.75:177.1,mobile?151.8:161),
        '--morph-logo-h':mix(mobile?47.15:50.6,mobile?43.7:46)
      };
      for(const [key,val] of Object.entries(vars))bar.style.setProperty(key,val.toFixed(2)+'px');
      bar.classList.toggle('scrolled',progress>=.995);
    };
    const queue=()=>{if(!frame)frame=requestAnimationFrame(morph)};
    morph();
    window.addEventListener('scroll',queue,{passive:true});
    window.addEventListener('resize',queue,{passive:true});
    const foot=document.createElement('footer');
    foot.className='crio-ed-footer';
    const fin=document.createElement('div');
    fin.className='crio-ed-footer-inner';
    const one=document.createElement('span');
    one.innerHTML='<b>Crio Creatives</b> / Visualization &amp; Design Studio';
    const two=document.createElement('span');
    two.textContent='Architecture · Brands · Experiences';
    const three=document.createElement('span');
    const website=document.createElement('a');
    website.href='https://criocreatives.com/';
    website.textContent='Crio website ↗';
    const contact=document.createElement('a');
    contact.href='https://criocreatives.com/#contact';
    contact.textContent='Enquiries ↗';
    three.append(website,document.createTextNode('   ·   '),contact);
    fin.append(one,two,three);
    foot.append(fin);
    body.append(foot);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
