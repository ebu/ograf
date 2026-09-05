const header = document.getElementById('site-header');
const heroBlock = document.querySelector('.hero-block');
const mainContent = document.getElementById('main-content');
const footer = document.querySelector('.site-footer');
const skipLink = document.querySelector('.skip-link');

function headerThreshold() {
    if (!heroBlock) return 8;

    return heroBlock.offsetHeight - 80;
}

function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > headerThreshold());
}

window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateHeader);
updateHeader();

document.getElementById('footer-year').textContent = new Date().getFullYear();

const toggle = document.getElementById('nav-toggle');
const nav = document.getElementById('site-nav');
const mobileNavQuery = window.matchMedia('(max-width: 640px)');

function syncNavAccessibility() {
    const isMobile = mobileNavQuery.matches;
    const isOpen = nav.classList.contains('is-open');
    const blocksBackground = isMobile && isOpen;

    nav.setAttribute('aria-hidden', String(isMobile && !isOpen));
    nav.inert = isMobile && !isOpen;
    mainContent.inert = blocksBackground;
    footer.inert = blocksBackground;
    skipLink.inert = blocksBackground;
}

function openNav() {
    nav.classList.add('is-open');
    header.classList.add('is-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
    document.body.style.overflow = 'hidden';
    syncNavAccessibility();
    nav.querySelector('.site-nav__link')?.focus();
}

function closeNav({ restoreFocus = false } = {}) {
    nav.classList.remove('is-open');
    header.classList.remove('is-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    document.body.style.overflow = '';
    syncNavAccessibility();
    if (restoreFocus && mobileNavQuery.matches) toggle.focus();
}

toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') {
        closeNav({ restoreFocus: true });
    } else {
        openNav();
    }
});

nav.querySelectorAll('.site-nav__link').forEach(link => {
    link.addEventListener('click', () => closeNav());
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;

    event.preventDefault();
    closeNav({ restoreFocus: true });
});

mobileNavQuery.addEventListener('change', () => {
    if (!mobileNavQuery.matches) closeNav();
    syncNavAccessibility();
});
syncNavAccessibility();
