/* -----------------------------------------------------------
   OGRAF WEBSITE - ANIMATIONS
   Requires: GSAP + ScrollTrigger
----------------------------------------------------------- */

gsap.registerPlugin(ScrollTrigger);

const motionMedia = gsap.matchMedia();

motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
const motionEvents = new AbortController();
const motionObservers = [];

/* -----------------------------------------
   HELPERS
----------------------------------------- */

const onScroll = (trigger, start = 'top 82%') => ({
  scrollTrigger: { trigger, start },
});


/* Cursor-following spotlight removed. */


/* -----------------------------------------
   1. HERO - word-reveal entrance
----------------------------------------- */

// Split headings into overflow-hidden word spans (skip the logo variant)
(function () {
  document.querySelectorAll('.hero__heading:not(.hero__heading--logo)').forEach(heading => {
    if (heading.querySelector('.h-line')) return;
    const lines = heading.innerHTML.split(/<br\s*\/?>/i);
    heading.innerHTML = lines.map(line =>
      `<span class="h-line">${
        line.trim().split(/(\s+)/).map(token =>
          token.trim()
            ? `<span class="h-line__wrap"><span class="h-word">${token}</span></span>`
            : token
        ).join('')
      }</span>`
    ).join('<br>');
  });
})();

const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

heroTl.from('.hero__eyebrow',  { opacity: 0, y: 16, duration: 0.5, ease: 'power3.out' });

if (document.querySelector('.h-word')) {
  heroTl.from('.h-word', {
    y: '120%',
    opacity: 0,
    duration: 0.9,
    stagger: { amount: 0.35, ease: 'power1.in' },
    ease: 'power4.out',
  }, '-=0.1');
}

heroTl
  .from('.hero__heading--logo', { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out' }, '-=0.7')
  .from('.hero__sub',      { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.35')
  .from('.hero__actions',  { opacity: 0, y: 16, duration: 0.5, ease: 'power3.out' }, '-=0.3')
  .from('.hero__badge',    { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' }, '-=0.2');


/* -----------------------------------------
   2. INTRO - word-by-word reveal
----------------------------------------- */

// Split each statement into overflow-hidden word spans
(function () {
  document.querySelectorAll('.intro__statement').forEach(el => {
    if (el.querySelector('.i-wrap')) return;
    el.innerHTML = el.innerHTML.split(/(<[^>]+>|&[^;]+;|\s+)/).map(token => {
      if (!token.trim() || token.startsWith('<') || token.startsWith('&')) return token;
      return `<span class="i-wrap"><span class="i-word">${token}</span></span>`;
    }).join('');
  });
})();

// Magnetic repulsion on word hover (with neighbor chain push)
(function () {
  document.querySelectorAll('.intro__statement:not(.intro__statement--accent)').forEach(statement => {
    const movers = Array.from(statement.querySelectorAll('.i-wrap')).map(el => ({
      el,
      xTo: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power2.out' }),
      yTo: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power2.out' }),
    }));

    statement.addEventListener('mousemove', e => {
      // Calculate raw force for each word based on cursor distance
      const raw = movers.map(({ el }) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 110;
        if (dist < radius && dist > 0) {
          const force = (1 - dist / radius) * 18;
          return { x: -(dx / dist) * force, y: -(dy / dist) * force };
        }
        return { x: 0, y: 0 };
      });

      // Apply force + neighbor influence (same line only)
      const tops = movers.map(({ el }) => el.getBoundingClientRect().top);
      movers.forEach(({ xTo, yTo }, i) => {
        let fx = raw[i].x;
        let fy = raw[i].y;
        if (i > 0 && Math.abs(tops[i] - tops[i - 1]) < 10) {
          fx += raw[i - 1].x * 0.4; fy += raw[i - 1].y * 0.4;
        }
        if (i < raw.length - 1 && Math.abs(tops[i] - tops[i + 1]) < 10) {
          fx += raw[i + 1].x * 0.4; fy += raw[i + 1].y * 0.4;
        }
        xTo(fx);
        yTo(fy);
      });
    }, { signal: motionEvents.signal });

    statement.addEventListener('mouseleave', () => {
      movers.forEach(({ xTo, yTo }) => { xTo(0); yTo(0); });
    }, { signal: motionEvents.signal });
  });
})();

gsap.from('.intro__statement .i-word', {
  y: '115%',
  duration: 0.75,
  stagger: { amount: 0.6, ease: 'power1.in' },
  ease: 'power4.out',
  ...onScroll('.section-intro'),
});


/* -----------------------------------------
   COMPARISON TABLE
----------------------------------------- */

const compareTl = gsap.timeline(onScroll('.section-compare'));
compareTl
  .from('.compare__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.compare__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.compare__table-wrap',      { opacity: 0, y: 24, duration: 0.6 }, '-=0.2');

gsap.from('.compare__table tbody tr', {
  opacity: 0, x: -16, duration: 0.4, stagger: 0.06, ease: 'power2.out',
  ...onScroll('.compare__table', 'top 80%'),
});


/* -----------------------------------------
   CODE SECTION
----------------------------------------- */

const codeTl = gsap.timeline(onScroll('.section-code'));
codeTl
  .from('.code-section__copy .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.code-section__copy h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.code-section__copy p',        { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, '-=0.2')
  .from('.code-block',                  { opacity: 0, x: 40, duration: 0.8, ease: 'power3.out' }, '-=0.5');


/* -----------------------------------------
   TESTIMONIALS
----------------------------------------- */

const testimonialsTl = gsap.timeline(onScroll('.section-testimonials'));
testimonialsTl
  .from('.testimonials__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.testimonials__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2');

gsap.from('.testimonial-card', {
  opacity: 0, y: 48, duration: 0.7, stagger: 0.12, ease: 'power3.out',
  ...onScroll('.testimonials__grid', 'top 85%'),
});


/* -----------------------------------------
   3. PROBLEM
----------------------------------------- */

const problemTl = gsap.timeline(onScroll('.section-problem'));
problemTl
  .from('.problem__copy .eyebrow',  { opacity: 0, y: 20, duration: 0.5 })
  .from('.problem__heading',        { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.problem__paragraphs p',   { opacity: 0, y: 20, duration: 0.5, stagger: 0.12 }, '-=0.2')
  .from('.pipeline--locked',        { opacity: 0, x: 40, duration: 0.7, ease: 'power3.out' }, '-=0.4')
  .from('.pipeline--locked .pipeline__step--locked', {
    opacity: 0, scale: 0.85, duration: 0.4, stagger: 0.1, ease: 'back.out(1.4)',
  }, '-=0.3');


/* -----------------------------------------
   4. SOLUTION
----------------------------------------- */

const solutionTl = gsap.timeline(onScroll('.section-solution'));
solutionTl
  .from('.pipeline--open', { opacity: 0, x: -40, duration: 0.7 })
  .from('.pipeline__step--blue, .pipeline__step--green, .pipeline__step--amber, .pipeline__step--violet', {
    opacity: 0, scale: 0.85, duration: 0.4, stagger: 0.1, ease: 'back.out(1.4)',
  }, '-=0.4')
  .from('.pipeline__swap',          { opacity: 0, y: 12, duration: 0.4 }, '-=0.1')
  .from('.solution__copy .eyebrow', { opacity: 0, y: 20, duration: 0.5 }, '-=0.5')
  .from('.solution__heading',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.3')
  .from('.solution__paragraphs p',  { opacity: 0, y: 20, duration: 0.5, stagger: 0.12 }, '-=0.2');


/* -----------------------------------------
   5. BENEFITS - 3D entrance + tilt hover
----------------------------------------- */

const benefitsTl = gsap.timeline(onScroll('.section-benefits'));
benefitsTl
  .from('.benefits__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.benefits__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2');

gsap.from('.benefit-card', {
  opacity: 0,
  y: 48,
  rotationX: 14,
  transformPerspective: 900,
  duration: 0.7,
  stagger: 0.08,
  ease: 'power3.out',
  ...onScroll('.benefits__grid', 'top 85%'),
});

document.querySelectorAll('.benefit-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card, { rotationY: x * 10, rotationX: -y * 10, transformPerspective: 700, duration: 0.3, ease: 'power1.out' });
  }, { signal: motionEvents.signal });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power2.out' });
  }, { signal: motionEvents.signal });
});


/* -----------------------------------------
   TWO CREATION PATHS
----------------------------------------- */

const pathsTl = gsap.timeline(onScroll('.section-paths'));
pathsTl
  .from('.paths__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.paths__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.paths__intro',           { opacity: 0, y: 16, duration: 0.5 }, '-=0.2');

// Use IntersectionObserver to avoid ScrollTrigger conflicts on path cards
(function () {
  const cards = document.querySelectorAll('.path-card');
  gsap.set(cards, { opacity: 0, y: 48 });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const i = Array.from(cards).indexOf(entry.target);
      gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.15, ease: 'power3.out' });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  motionObservers.push(obs);
  cards.forEach(card => obs.observe(card));
})();


/* -----------------------------------------
   6. WHAT IT IS / ISN'T
----------------------------------------- */

const whatisTl = gsap.timeline(onScroll('.section-whatis'));
whatisTl
  .from('.whatis__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.whatis__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2');

gsap.from('.whatis__item--is', {
  opacity: 0, x: -24, duration: 0.5, stagger: 0.08, ease: 'power3.out',
  ...onScroll('.whatis__col--is', 'top 80%'),
});
gsap.from('.whatis__item--isnot', {
  opacity: 0, x: 24, duration: 0.5, stagger: 0.08, ease: 'power3.out',
  ...onScroll('.whatis__col--isnot', 'top 80%'),
});


/* -----------------------------------------
   7. PROJECT STATUS
----------------------------------------- */

const statusTl = gsap.timeline(onScroll('.section-status'));
statusTl
  .from('.status__eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.status__heading', { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.status__intro', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
  .from('.status-card', {
    opacity: 0, y: 28, duration: 0.6, stagger: 0.12, ease: 'power3.out',
  }, '-=0.3');


/* -----------------------------------------
   8. VENDORS
----------------------------------------- */

gsap.from('.vendors__header .eyebrow, .vendors__header h2, .vendors__intro', {
  opacity: 0, y: 24, duration: 0.6, stagger: 0.1, ease: 'power3.out',
  ...onScroll('.section-vendors'),
});

/* -----------------------------------------
   9. GITHUB
----------------------------------------- */

const githubTl = gsap.timeline(onScroll('.section-github'));
githubTl
  .from('.github__eyebrow',   { opacity: 0, y: 20, duration: 0.5 })
  .from('.github__heading',   { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.github__desc',      { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
  .from('.github__links',     { opacity: 0, y: 16, duration: 0.5 }, '-=0.2')
  .from('.github__contents',  { opacity: 0, x: 40, duration: 0.7 }, '-=0.5')
  .from('.github__list-item', { opacity: 0, x: 20, duration: 0.4, stagger: 0.08 }, '-=0.4');


/* -----------------------------------------
   10. DEMOS
----------------------------------------- */

const demosTl = gsap.timeline(onScroll('.section-demos'));
demosTl
  .from('.demos__header .eyebrow', { opacity: 0, y: 20, duration: 0.5 })
  .from('.demos__header h2',       { opacity: 0, y: 30, duration: 0.6 }, '-=0.2')
  .from('.demos__intro',           { opacity: 0, y: 16, duration: 0.5 }, '-=0.2');
// Note: .demo-card not animated - iframe must stay composited


/* -----------------------------------------
   11. FOOTER
----------------------------------------- */

gsap.from('.footer__brand, .footer__nav-group', {
  opacity: 0, y: 24, duration: 0.6, stagger: 0.1, ease: 'power3.out',
  ...onScroll('.site-footer', 'top 95%'),
});

return () => {
  motionEvents.abort();
  motionObservers.forEach(observer => observer.disconnect());
};
});
