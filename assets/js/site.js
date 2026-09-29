(() => {
  const header = document.getElementById('site-header');
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const updateHeader = () => header && header.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
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
      const message = (form.querySelector('[name="message"]')?.value || '').toLowerCase();
      const spamPhrases = [
        'wayback machine','web archives','restore your site','restore any site',
        'website restore','expired domains','lost pages','200 pages restore',
        'wordpress restore option','archive restore','recover website from archive'
      ];

      if ((trap && trap.value.trim()) || elapsed < 3000 || spamPhrases.some(term => message.includes(term))) {
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
