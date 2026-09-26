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
        nav.classList.remove('open'); header.classList.remove('menu-open');
        button.setAttribute('aria-expanded', 'false'); button.textContent = 'Menu';
      }
    });
  }
})();