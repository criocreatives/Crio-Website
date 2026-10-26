(() => {
  const links = [...document.querySelectorAll('.image-link')];
  const items = links.map(link => ({
    src: link.getAttribute('href'),
    title: link.dataset.title || 'Project view',
    alt: link.querySelector('img')?.alt || ''
  }));

  links.forEach(link => {
    const img = link.querySelector('img');
    if (!img) return;
    const markMissing = () => link.classList.add('is-missing');
    img.addEventListener('error', markMissing);
    if (img.complete && img.naturalWidth === 0) markMissing();
  });

  const viewer = document.getElementById('viewer');
  const viewerImage = document.getElementById('viewer-image');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerCount = document.getElementById('viewer-count');
  const viewerDownload = document.getElementById('viewer-download');
  const prev = document.getElementById('viewer-prev');
  const next = document.getElementById('viewer-next');
  const close = viewer.querySelector('.viewer-close');
  let current = 0;

  function show(index) {
    current = (index + items.length) % items.length;
    const item = items[current];
    viewerImage.src = item.src;
    viewerImage.alt = item.alt;
    viewerTitle.textContent = item.title;
    viewerCount.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    viewerDownload.href = item.src;
    viewerDownload.setAttribute('download', item.src.split('/').pop());
  }

  links.forEach((link, i) => link.addEventListener('click', e => {
    if (link.classList.contains('is-missing')) { e.preventDefault(); return; }
    e.preventDefault();
    show(i);
    viewer.showModal();
  }));

  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  window.addEventListener('keydown', e => {
    if (!viewer.open) return;
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();