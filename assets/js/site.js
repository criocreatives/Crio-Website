(() => {
  // GA4: track the public main site, not protected payment information or other Crio subdomains.
  if (/^(?:www\.)?criocreatives\.com$/.test(window.location.hostname)
      && !/^\/payment-details(?:\/|$)/.test(window.location.pathname)) {
    const ga4Id = 'G-8SQ1DJNJWM';
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

  const header = document.getElementById('site-header');
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  let headerFrame = 0;
  const updateHeader = () => {
    if (!header) return;

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

    header.style.setProperty('--morph-top', mix(floatTop, 0).toFixed(2) + 'px');
    header.style.setProperty('--morph-left', mix(floatEdge, 0).toFixed(2) + 'px');
    header.style.setProperty('--morph-right', mix(floatEdge, 0).toFixed(2) + 'px');
    header.style.setProperty('--morph-radius', mix(floatRadius, 0).toFixed(2) + 'px');
    header.style.setProperty('--morph-pad-y', mix(floatPad, 4).toFixed(2) + 'px');
    // Keep the scroll-linked morph, but scale the logo uniformly by 15%.
    const logoScale = 1.15;
    header.style.setProperty('--morph-logo-w', (mix(startLogoW, endLogoW) * logoScale).toFixed(2) + 'px');
    header.style.setProperty('--morph-logo-h', (mix(startLogoH, endLogoH) * logoScale).toFixed(2) + 'px');
    header.classList.toggle('scrolled', raw >= .995);
  };
  const queueHeaderUpdate = () => {
    if (headerFrame) return;
    headerFrame = requestAnimationFrame(() => {
      headerFrame = 0;
      updateHeader();
    });
  };
  updateHeader();
  window.addEventListener('scroll', queueHeaderUpdate, { passive: true });
  window.addEventListener('resize', queueHeaderUpdate, { passive: true });
  if (button && nav) {
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      header.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Close' : 'Menu';
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        nav.classList.remove('open');
        header.classList.remove('menu-open');
        button.setAttribute('aria-expanded', 'false');
        button.textContent = 'Menu';
      }
    });
  }
  const form = document.querySelector('.contact-form');
  if (form) {
    const startedAt = Date.now();
    const startedField = form.querySelector('#form-started');
    const status = form.querySelector('#contact-status');
    const submit = form.querySelector('button[type="submit"]');
    if (startedField) startedField.value = String(startedAt);

    form.addEventListener('submit', event => {
      const trap = form.querySelector('input[name="website"]');
      const elapsed = Date.now() - startedAt;
      const name = (form.querySelector('[name="name"]')?.value || '').toLowerCase();
      const email = (form.querySelector('[name="email"]')?.value || '').toLowerCase();
      const message = (form.querySelector('[name="message"]')?.value || '').toLowerCase();
      const submissionText = [name, email, message].join(' ');
      const spamPhrases = [
        'wayback machine','web archives','restore your site','restore any site',
        'website restore','expired domains','lost pages','200 pages restore',
        'wordpress restore option','archive restore','recover website from archive',
        'reviewed your website','website score','digital presence','online presence',
        'potential business growth','technology solutions','quick conversation',
        'web development services','kratvya.com','kratvya','finalscout.com','finalscout'
      ];

      if ((trap && trap.value.trim()) || elapsed < 3000 || spamPhrases.some(term => submissionText.includes(term))) {
        event.preventDefault();
        if (status) {
          status.dataset.state = 'error';
          status.textContent = 'We could not submit this enquiry. Please review your message and try again.';
        }
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending…';
      }
    });
  }
})();
