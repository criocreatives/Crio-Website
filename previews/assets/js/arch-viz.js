/* One shared Arch/Viz viewer and responsive navigation, no external dependencies. */
(() => {
  const dialog = document.getElementById('av-dialog');
  if (!dialog) return;
  const shots = [...document.querySelectorAll('.av-shot')];
  const hero = document.querySelector('.av-hero-image');
  const view = document.getElementById('av-full');
  const count = document.getElementById('av-count');
  const closeButton = document.getElementById('av-close');
  const prevButton = document.getElementById('av-prev');
  const nextButton = document.getElementById('av-next');
  const images = shots.map(el => ({
    src: new URL(el.dataset.full || el.querySelector('img').src, document.baseURI).href,
    alt: el.querySelector('img').alt
  }));
  const heroUnique = Boolean(hero) && !images.some(item => item.src === hero.src);
  if (heroUnique) images.unshift({src: hero.src, alt: hero.alt});
  let index = 0;
  let opener = null;
  let touchX = null;

  function show(nextIndex) {
    if (!images.length) return;
    index = (nextIndex + images.length) % images.length;
    view.src = images[index].src;
    view.alt = images[index].alt;
    count.textContent = (index + 1) + ' / ' + images.length;
  }
  function open(nextIndex, source) {
    if (!images.length) return;
    opener = source;
    show(nextIndex);
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  }
  function close() {
    if (dialog.open) dialog.close();
  }
  shots.forEach((shot, i) => {
    const showShot = () => open(i + (heroUnique ? 1 : 0), shot);
    shot.addEventListener('click', showShot);
    shot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showShot();
      }
    });
  });
  document.querySelector('.av-view-hero')?.addEventListener('click', e => {
    if (!hero) return;
    const heroIndex = images.findIndex(item => item.src === hero.src);
    open(Math.max(0, heroIndex), e.currentTarget);
  });
  closeButton.addEventListener('click', close);
  prevButton.addEventListener('click', () => show(index - 1));
  nextButton.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  dialog.addEventListener('close', () => opener?.focus?.());
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  dialog.addEventListener('touchstart', e => {
    touchX = e.changedTouches[0]?.screenX ?? null;
  }, {passive:true});
  dialog.addEventListener('touchend', e => {
    if (touchX === null) return;
    const delta = (e.changedTouches[0]?.screenX ?? touchX) - touchX;
    if (Math.abs(delta) > 60) show(index + (delta < 0 ? 1 : -1));
    touchX = null;
  }, {passive:true});

  const nav = document.getElementById('av-project-nav');
  const toggle = document.querySelector('.av-menu-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const expanding = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanding));
      nav.classList.toggle('av-open', expanding);
    });
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) {
        nav.classList.remove('av-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
