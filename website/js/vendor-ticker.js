/*
 * Vendor logo ticker (hero)
 *
 * Loads logo filenames from `website/assets/img/vendor-logos/hero/manifest.json`
 * (regenerate with the website tooling). Falls back to
 * parsing a directory listing if no manifest is present - handy in dev.
 *
 * The hero ticker uses its own folder so single-colour / silhouette-friendly
 * logo variants can live there independently of the full-colour logos used
 * in the bottom "Vendors & adoptors" section.
 *
 * Drop a new logo into the folder, regen the manifest, deploy.
 *
 * The track is filled with enough duplicate sets to cover the viewport
 * plus one extra set, then animated by exactly one set's width - so the
 * loop is seamless at any viewport width.
 */
(async function initVendorTicker() {
  const track = document.getElementById('vendor-ticker-track');
  if (!track) return;
  const viewport = track.closest('.vendor-ticker__viewport') || track.parentElement;

  const folder = 'website/assets/img/vendor-logos/hero/';
  const exts = /\.(svg|png|jpg|jpeg|webp|gif|avif)$/i;

  const files = await loadFileList(folder, exts);
  if (!files.length) return;

  const buildSet = () => {
    const frag = document.createDocumentFragment();
    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'vendor-ticker__item';
      const img = document.createElement('img');
      img.src = folder + encodeURIComponent(file);
      img.alt = file.replace(exts, '').replace(/[-_]+/g, ' ').trim();
      img.loading = 'eager';
      img.decoding = 'async';
      item.appendChild(img);
      frag.appendChild(item);
    }
    return frag;
  };

  // Append two sets first so we can measure the period (distance between
  // equivalent items in adjacent sets - accounts for flex gap automatically).
  track.appendChild(buildSet());
  track.appendChild(buildSet());

  await whenImagesLoaded(track);

  const setLen = files.length;
  let period = track.children[setLen].offsetLeft - track.children[0].offsetLeft;
  if (!period || !isFinite(period)) period = track.scrollWidth / 2;

  // Append additional sets until the track covers viewport + one set buffer.
  const ensureWidth = () => {
    const target = viewport.clientWidth + period + 8;
    while (track.scrollWidth < target) track.appendChild(buildSet());
  };
  ensureWidth();

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let tickerAnimation = null;

  const syncTickerAnimation = () => {
    tickerAnimation?.cancel();
    tickerAnimation = null;
    track.style.transform = '';
    if (motionQuery.matches) return;

    const duration = Math.max(20000, setLen * 4000);
    tickerAnimation = track.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-period}px)` }
      ],
      { duration, iterations: Infinity, easing: 'linear' }
    );
  };

  syncTickerAnimation();
  motionQuery.addEventListener('change', syncTickerAnimation);

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(ensureWidth);
  });

  function whenImagesLoaded(parent) {
    const imgs = [...parent.querySelectorAll('img')];
    return Promise.all(imgs.map(img =>
      img.complete && img.naturalWidth
        ? null
        : new Promise(res => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          })
    ));
  }

  async function loadFileList(folder, exts) {
    try {
      const r = await fetch(folder + 'manifest.json', { cache: 'no-cache' });
      if (r.ok) {
        const list = await r.json();
        if (Array.isArray(list)) return list.filter(f => exts.test(f));
      }
    } catch (_) { /* manifest is optional */ }

    try {
      const r = await fetch(folder, { cache: 'no-cache' });
      if (!r.ok) return [];
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const seen = new Set();
      return [...doc.querySelectorAll('a')]
        .map(a => decodeURIComponent((a.getAttribute('href') || '').split('/').pop().split('?')[0]))
        .filter(name => name && exts.test(name) && !seen.has(name) && seen.add(name));
    } catch (e) {
      console.warn('Vendor ticker: could not list directory', e);
      return [];
    }
  }
})();
