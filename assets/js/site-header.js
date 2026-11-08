/* Shared Crio header morph and mobile navigation. */
(() => {
  'use strict';
  const header = document.getElementById('site-header');
  if (!header || header.dataset.crioHeaderReady === 'true') return;
  header.dataset.crioHeaderReady = 'true';

  const button = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#site-nav');
  let frame = 0;

  const updateHeader = () => {
    const viewport = window.innerWidth;
    const mobile = viewport <= 900;
    const compact = viewport <= 520;
    const range = mobile ? 110 : 180;
    const raw = Math.max(0, Math.min(1, window.scrollY / range));
    const eased = raw * raw * (3 - 2 * raw);
    const pageInset = compact ? 16 : mobile ? 20 : 40;
    const pageWidth = Math.min(1360, Math.max(0, viewport - pageInset * 2));
    const pageMargin = Math.max(0, (viewport - pageWidth) / 2);
    const floatEdge = compact ? 6 : mobile ? 8 : Math.max(12, pageMargin - 32);
    const floatTop = mobile ? 24 : 50;
    const floatRadius = mobile ? 16 : 18;
    const floatPad = mobile ? 8 : 9;
    const startLogoW = compact ? 145 : mobile ? 145 : 154;
    const startLogoH = compact ? 41 : mobile ? 41 : 44;
    const endLogoW = compact ? 132 : mobile ? 132 : 140;
    const endLogoH = compact ? 38 : mobile ? 38 : 40;
    const mix = (from, to) => from + (to - from) * eased;
    const logoScale = 1.15;

    header.style.setProperty('--morph-top', `${mix(floatTop, 0).toFixed(2)}px`);
    header.style.setProperty('--morph-left', `${mix(floatEdge, 0).toFixed(2)}px`);
    header.style.setProperty('--morph-right', `${mix(floatEdge, 0).toFixed(2)}px`);
    header.style.setProperty('--morph-radius', `${mix(floatRadius, 0).toFixed(2)}px`);
    header.style.setProperty('--morph-pad-y', `${mix(floatPad, 4).toFixed(2)}px`);
    header.style.setProperty('--morph-logo-w', `${(mix(startLogoW, endLogoW) * logoScale).toFixed(2)}px`);
    header.style.setProperty('--morph-logo-h', `${(mix(startLogoH, endLogoH) * logoScale).toFixed(2)}px`);
    header.classList.toggle('scrolled', raw >= .995);
  };

  const queueUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateHeader();
    });
  };

  const closeMenu = (returnFocus = false) => {
    if (!button || !nav) return;
    nav.classList.remove('open');
    header.classList.remove('menu-open');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Menu';
    if (returnFocus) button.focus();
  };

  const updateNavigation = () => {
    if (!button) return;
    header.classList.remove('nav-compact');
    const linkWidth = nav ? Array.from(nav.children).reduce((width, link) => width + link.getBoundingClientRect().width, 0) : 0;
    const needsMenu = window.innerWidth <= 1280 || (nav && (nav.scrollWidth > nav.clientWidth + 1 || linkWidth > nav.clientWidth + 1));
    header.classList.toggle('nav-compact', needsMenu);
    if (needsMenu) closeMenu();
  };

  const handleResize = () => {
    updateNavigation();
    queueUpdate();
    if (!header.classList.contains('nav-compact')) closeMenu();
  };

  updateHeader();
  updateNavigation();
  if (document.fonts?.ready) document.fonts.ready.then(updateNavigation);
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });

  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
})();
