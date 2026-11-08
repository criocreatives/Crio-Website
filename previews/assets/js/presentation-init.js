/* Crio Creatives | project-specific editorial styling and footer. */
(() => {
  function initialize() {
    const body = document.body;
    if (!body || body.classList.contains('crio-ed')) return;
    const slug = location.pathname.replace(/^\/previews(?:\/|$)/, '/').split('/').filter(Boolean)[0] || 'index';
    body.classList.add('crio-ed', 'crio-ed--' + slug);
    const rule = document.createElement('div');
    rule.className = 'crio-ed-rule';
    const left = document.createElement('span');
    left.innerHTML = slug === 'index' ? '<strong>Crio /</strong> All project previews' : '<strong>Crio /</strong> Selected project presentation';
    const right = document.createElement('span');
    right.textContent = (document.title || 'Project preview').replace(/\s*\|.*$/, '').replace(/\s+—\s+Crio Creatives.*$/, '');
    rule.append(left, right);
    const header = document.getElementById('site-header');
    if (header) header.insertAdjacentElement('afterend', rule);
    else body.prepend(rule);
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
    const externalIcon = '<svg class="crio-icon crio-icon--arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:-.125em;flex-shrink:0;pointer-events:none"><path d="M7 17 17 7M7 7h10v10"/></svg>';
    website.innerHTML='Crio website ' + externalIcon;
    const contact=document.createElement('a');
    contact.href='https://criocreatives.com/#contact';
    contact.innerHTML='Enquiries ' + externalIcon;
    three.append(website,document.createTextNode('   ·   '),contact);
    fin.append(one,two,three);
    foot.append(fin);
    body.append(foot);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
