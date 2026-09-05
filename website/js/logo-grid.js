/*
 * Logo-grid auto-discovery
 *
 * Renders the bottom "Vendors & adoptors" section's logo grids from
 * manifest.json files instead of hand-maintained <li> tags.
 *
 * Each grid container is just an empty <ul> annotated with two data
 * attributes:
 *   <ul class="logo-grid"
 *       data-manifest="website/assets/img/vendor-logos/vendors/manifest.json"
 *       data-base="website/assets/img/vendor-logos/vendors/">
 *   </ul>
 *
 * The manifest is an array of objects:
 *   [
 *     { "file": "adobe.svg",       "name": "Adobe",       "url": "https://www.adobe.com/" },
 *     { "file": "blackmagic.svg",  "name": "Blackmagic",  "url": "" }
 *   ]
 *
 * Empty `url` -> renders the logo without a link (image only). Useful
 * when a vendor has no URL or you haven't filled it in yet.
 *
 * Add a logo:
 *   1. Drop the file in the folder
 *   2. Run `npm --prefix website/_tooling run update-manifests`
 *      entry with `name` derived from the filename and `url: ""`
 *   3. Edit manifest.json to set the proper name + url
 *
 * The script also detects file deletions (entries pointing at missing
 * files are dropped on the next run) and preserves any name/url you've
 * already filled in.
 */
(function () {
  const grids = document.querySelectorAll('.logo-grid[data-manifest]');
  if (!grids.length) return;

  const escAttr = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const renderEntry = (entry, base) => {
    // Tolerate a plain string for backward-compat with the hero
    // manifest format (string array of filenames).
    const file = typeof entry === 'string' ? entry : entry.file;
    if (!file) return '';
    const name = typeof entry === 'object' && entry.name ? entry.name : '';
    const url  = typeof entry === 'object' && entry.url  ? entry.url  : '';
    const src  = base + file;
    const img  = `<img src="${escAttr(src)}" alt="${escAttr(name)}" loading="lazy">`;
    const inner = url
      ? `<a href="${escAttr(url)}" target="_blank" rel="noopener">${img}</a>`
      : img;
    return `<li class="logo-grid__item">${inner}</li>`;
  };

  grids.forEach(async grid => {
    const manifestUrl = grid.dataset.manifest;
    const base        = grid.dataset.base || '';
    try {
      const r = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!r.ok) return;
      const list = await r.json();
      if (!Array.isArray(list)) return;
      // Replace whatever was in the <ul> (server-rendered fallback or
      // empty) with the freshly rendered list.
      grid.innerHTML = list.map(e => renderEntry(e, base)).filter(Boolean).join('');
      if (window.gsap && grid.children.length) {
        const motionMedia = window.gsap.matchMedia();
        motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
          window.gsap.from(grid.children, {
            opacity: 0,
            scale: 0.88,
            duration: 0.4,
            stagger: 0.05,
            ease: 'back.out(1.2)',
            scrollTrigger: { trigger: grid, start: 'top 85%' },
          });
        });
      }
    } catch (_) {
      /* Network / parse error -> keep any pre-rendered fallback. */
    }
  });
})();
