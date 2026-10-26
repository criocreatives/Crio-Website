/* Crio Plugins / floating-header morph and accessible mobile menu */
(() => {
  'use strict';
  const header = document.getElementById('site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!header) return;
  let ticking = false;
  const update = () => {
    const mobile = window.innerWidth <= 760;
    const limit = mobile ? 110 : 180;
    const raw = Math.min(1, Math.max(0, window.scrollY / limit));
    const progress = raw * raw * (3 - 2 * raw);
    const inset = mobile ? 14 : Math.max(16, Math.min(64, window.innerWidth * .035));
    header.style.setProperty('--head-x', (inset * (1 - progress)).toFixed(2) + 'px');
    header.style.setProperty('--head-top', ((mobile ? 22 : 38) * (1 - progress)).toFixed(2) + 'px');
    header.style.setProperty('--head-radius', ((mobile ? 14 : 17) * (1 - progress)).toFixed(2) + 'px');
    ticking = false;
  };
  const onMove = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', onMove, {passive:true});
  window.addEventListener('resize', onMove, {passive:true});
  update();
  if (!toggle || !nav) return;
  const close = () => {
    nav.classList.remove('open');
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Menu';
  };
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open',open);
    header.classList.toggle('menu-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); toggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (!header.contains(e.target)) close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) close();
  }, {passive:true});
})();
