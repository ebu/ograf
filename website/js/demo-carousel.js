(function () {
    const DEMO_HASH_PREFIX = '#demo-';
    const track = document.querySelector('.demo-carousel__track');
    const slides = [...document.querySelectorAll('.demo-carousel__slide')];
    const btnPrev = document.querySelector('.demo-carousel__btn--prev');
    const btnNext = document.querySelector('.demo-carousel__btn--next');
    const dots = [...document.querySelectorAll('.demo-carousel__dot')];
    const dotList = document.querySelector('.demo-carousel__dots');
    const carousel = document.querySelector('.demo-carousel');
    const demosSection = document.getElementById('demos');
    const SYNCHRONIZED_REGION_SELECTORS = [
        '.demo-card__header',
        '.demo-aspect-bar',
        '.demo-controls'
    ];
    const cardLayoutQuery = window.matchMedia('(min-width: 901px)');

    if (!track || !slides.length || !btnPrev || !btnNext || !dotList || !carousel) return;

    const exampleIndexes = new Map(slides.map((slide, index) => [
        slide.dataset.exampleId,
        index
    ]));
    let current = 0;
    let layoutFrame = null;

    function synchronizeRegionHeight(selector) {
        const regions = slides.map(slide => slide.querySelector(selector)).filter(Boolean);
        if (!regions.length) return;

        regions.forEach(region => region.style.removeProperty('min-height'));
        if (!cardLayoutQuery.matches) return;

        const maximumHeight = Math.ceil(Math.max(
            ...regions.map(region => region.getBoundingClientRect().height)
        ));
        regions.forEach(region => region.style.minHeight = `${maximumHeight}px`);
    }

    function synchronizeCardLayout() {
        SYNCHRONIZED_REGION_SELECTORS.forEach(synchronizeRegionHeight);
    }

    function scheduleCardLayoutSynchronization() {
        window.cancelAnimationFrame(layoutFrame);
        layoutFrame = window.requestAnimationFrame(() => {
            layoutFrame = null;
            synchronizeCardLayout();
        });
    }

    function loadSlide(slide) {
        slide.querySelectorAll('iframe[data-src]').forEach(iframe => {
            const source = iframe.dataset.src;
            const url = new URL(source, document.baseURI);
            if (iframe.contentWindow) iframe.contentWindow.location.replace(url.href);
            else iframe.src = url.href;
            iframe.dataset.loadedSrc = source;
            iframe.removeAttribute('data-src');
        });
    }

    function getOffset(index) {
        const slideWidth = slides[0].offsetWidth;
        const gap = parseFloat(getComputedStyle(track).gap) || 20;

        return index * (slideWidth + gap);
    }

    function updateDemoHash(exampleId, mode) {
        const url = new URL(window.location.href);
        url.hash = `${DEMO_HASH_PREFIX}${encodeURIComponent(exampleId)}`;
        window.history[`${mode}State`](window.history.state, '', url);
    }

    function scrollToDemos() {
        if (!demosSection) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        demosSection.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
        });
    }

    function goTo(index, {
        historyMode = null,
        loadContent = true,
        moveTabFocus = false,
        scroll = false
    } = {}) {
        const selectedIndex = Math.max(0, Math.min(index, slides.length - 1));
        const focusedControl = document.activeElement;
        current = selectedIndex;
        if (loadContent) loadSlide(slides[selectedIndex]);
        track.style.transform = `translateX(-${getOffset(selectedIndex)}px)`;

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === selectedIndex;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
            slide.inert = !isActive;
        });
        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === selectedIndex;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-selected', String(isActive));
            dot.tabIndex = isActive ? 0 : -1;
        });

        btnPrev.disabled = selectedIndex === 0;
        btnNext.disabled = selectedIndex === slides.length - 1;

        if (historyMode) {
            updateDemoHash(slides[selectedIndex].dataset.exampleId, historyMode);
        }
        if (scroll) scrollToDemos();

        if (moveTabFocus || (focusedControl === btnPrev && btnPrev.disabled)
            || (focusedControl === btnNext && btnNext.disabled)) {
            dots[selectedIndex].focus();
        }
    }

    function goToExample(exampleId, options = {}) {
        const index = exampleIndexes.get(exampleId);
        if (index === undefined) return false;

        goTo(index, options);

        return true;
    }

    function exampleIdFromHash() {
        if (!window.location.hash.startsWith(DEMO_HASH_PREFIX)) return null;

        try {
            const exampleId = decodeURIComponent(
                window.location.hash.slice(DEMO_HASH_PREFIX.length)
            );

            return exampleIndexes.has(exampleId) ? exampleId : null;
        } catch (_) {
            return null;
        }
    }

    function syncFromLocation() {
        const exampleId = exampleIdFromHash();
        if (exampleId) goToExample(exampleId, { scroll: true });
    }

    btnPrev.addEventListener('click', () => goTo(current - 1, { historyMode: 'replace' }));
    btnNext.addEventListener('click', () => goTo(current + 1, { historyMode: 'replace' }));
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
        goTo(index, { historyMode: 'replace' });
    }));

    dotList.addEventListener('keydown', event => {
        let nextIndex = null;
        if (event.key === 'ArrowLeft') nextIndex = (current - 1 + slides.length) % slides.length;
        if (event.key === 'ArrowRight') nextIndex = (current + 1) % slides.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = slides.length - 1;
        if (nextIndex === null) return;

        event.preventDefault();
        goTo(nextIndex, { historyMode: 'replace', moveTabFocus: true });
    });

    document.addEventListener('click', event => {
        const target = event.target.closest('[data-demo-target]');
        if (!target) return;

        goToExample(target.dataset.demoTarget, {
            historyMode: 'push',
            scroll: true
        });
    });

    if ('IntersectionObserver' in window) {
        const playerObserver = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            playerObserver.disconnect();
            loadSlide(slides[current]);
        }, { rootMargin: '500px 0px' });
        playerObserver.observe(carousel);
    } else {
        loadSlide(slides[current]);
    }

    window.addEventListener('resize', () => {
        goTo(current, { loadContent: false });
        scheduleCardLayoutSynchronization();
    });
    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);

    synchronizeCardLayout();
    document.fonts?.ready.then(scheduleCardLayoutSynchronization);

    const initialExampleId = exampleIdFromHash();
    if (initialExampleId) {
        goToExample(initialExampleId);
        requestAnimationFrame(scrollToDemos);
    } else {
        goTo(0, { loadContent: false });
    }
})();
