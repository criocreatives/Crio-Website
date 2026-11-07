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
        'web development services','kratvya.com','kratvya','finalscout.com','finalscout',
        'directoryinspector.com','submit your site to multiple directories'
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
