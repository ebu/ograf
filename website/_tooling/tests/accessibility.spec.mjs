import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa'
];

async function openAccessibleLandingPage(page) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#stage-toggle')).toBeEnabled();
}

function formatAxeResults(results) {
    return results.map(result => ({
        id: result.id,
        impact: result.impact,
        help: result.help,
        helpUrl: result.helpUrl,
        targets: result.nodes.map(node => node.target)
    }));
}

async function expectNoWcagViolations(page, testInfo, stateLabel) {
    const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .exclude({ fromFrames: ['iframe.demo-player__iframe', 'html'] })
        .analyze();

    if (results.incomplete.length) {
        await testInfo.attach(`axe-incomplete-${stateLabel}`, {
            body: JSON.stringify(formatAxeResults(results.incomplete), null, 2),
            contentType: 'application/json'
        });
    }

    expect(
        formatAxeResults(results.violations),
        `WCAG A/AA violations in state: ${stateLabel}`
    ).toEqual([]);
}

async function expectFocusRing(locator) {
    const ring = await locator.evaluate(element => {
        const style = getComputedStyle(element);

        return {
            style: style.outlineStyle,
            width: parseFloat(style.outlineWidth)
        };
    });

    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(3);
}

async function expectCodePanelsToFit(page) {
    const codeTabs = page.locator('.code-block__tab');

    for (let index = 0; index < await codeTabs.count(); index += 1) {
        await codeTabs.nth(index).click();
        const panelId = await codeTabs.nth(index).getAttribute('aria-controls');
        const panel = page.locator(`#${panelId}`);
        await expect(panel).toBeVisible();

        const dimensions = await panel.evaluate(element => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
}

test('@mobile visible application states have no WCAG A or AA violations', async ({ page }, testInfo) => {
    await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><title>Video</title><body>Video</body></html>'
    }));
    await openAccessibleLandingPage(page);
    await expectCodePanelsToFit(page);

    await expect(page.locator('.demo-player__iframe')).toHaveCount(6);
    for (const iframe of await page.locator('.demo-player__iframe').all()) {
        await expect(iframe).toHaveAttribute('title', /\S+/);
    }
    await expectNoWcagViolations(page, testInfo, 'initial');

    const navToggle = page.locator('#nav-toggle');
    if (await navToggle.isVisible()) {
        await navToggle.click();
        await expectNoWcagViolations(page, testInfo, 'mobile-navigation-open');
        await page.keyboard.press('Escape');
    }

    const demoTabs = page.locator('.demo-carousel__dot');
    for (let index = 0; index < await demoTabs.count(); index += 1) {
        await demoTabs.nth(index).click();
        await expectNoWcagViolations(page, testInfo, `demo-${index + 1}`);
    }

    await page.locator('.section-video__consent').click();
    await expect(page.locator('.section-video__embed iframe')).toBeFocused();
    await expectNoWcagViolations(page, testInfo, 'video-consented');
});

test('@webkit keyboard users can operate navigation, demos, formats, and code tabs', async ({
    browserName,
    page
}) => {
    await openAccessibleLandingPage(page);

    if (browserName === 'webkit') {
        await page.locator('.skip-link').focus();
    } else {
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.press('Tab');
    }
    await expect(page.locator('.skip-link')).toBeFocused();
    await expectFocusRing(page.locator('.skip-link'));
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    await page.goto('./');
    const navToggle = page.locator('#nav-toggle');
    if (browserName === 'webkit') {
        const firstNavigationControl = await navToggle.isVisible()
            ? navToggle
            : page.locator('.site-nav__link').first();
        await firstNavigationControl.focus();
    } else {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
    }
    if (await navToggle.isVisible()) {
        await expect(navToggle).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('.site-nav__link').first()).toBeFocused();
        await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
        await expect(page.locator('.site-footer')).toHaveAttribute('inert', '');
        await page.keyboard.press('Escape');
        await expect(navToggle).toBeFocused();
        await page.keyboard.press('Space');
        await expect(page.locator('.site-nav__link').first()).toBeFocused();
        await page.keyboard.press('Escape');
    } else {
        await expect(page.locator('.site-nav__link').first()).toBeFocused();
    }
    await expect(page.locator('.site-header__logo')).not.toBeFocused();

    const firstDemoTab = page.locator('#demo-tab-0');
    await firstDemoTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#demo-tab-1')).toBeFocused();
    await expect(page.locator('#demo-tab-1')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.locator('#demo-tab-5')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(firstDemoTab).toBeFocused();
    await page.locator('#demo-tab-4').focus();
    await page.keyboard.press('Enter');
    await page.locator('.demo-carousel__btn--next').focus();
    await expect(page.locator('.demo-carousel__btn--next')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#demo-tab-5')).toBeFocused();

    await page.locator('#demo-tab-2').click();

    const formatRadios = page.locator(
        '#demo-slide-2 .demo-aspect-bar__options [role="radio"]'
    );
    await formatRadios.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(formatRadios.nth(1)).toBeFocused();
    await expect(formatRadios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End');
    await expect(formatRadios.last()).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Home');
    await expect(formatRadios.first()).toHaveAttribute('aria-checked', 'true');

    const firstCodeTab = page.locator('#code-tab-manifest');
    await firstCodeTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#code-tab-module')).toBeFocused();
    await expect(page.locator('#code-panel-module')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(firstCodeTab).toBeFocused();
    await expect(page.locator('#code-panel-manifest')).toBeVisible();

    await firstDemoTab.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#sb-play')).toBeEnabled();
    await page.locator('#sb-play').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#sb-status')).toHaveAttribute('data-state', 'playing');
    await page.locator('#sb-update').focus();
    await page.keyboard.press('Enter');
    await page.locator('#sb-stop').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#sb-status')).toHaveAttribute('data-state', 'ready');

    await page.locator('.section-video__consent').focus();
    await expectFocusRing(page.locator('.section-video__consent'));
    await page.keyboard.press('Enter');
    await expect(page.locator('.section-video__embed iframe')).toBeFocused();

    const invalidFocus = await page.evaluate(() => {
        const active = document.activeElement;

        return Boolean(active?.closest('[aria-hidden="true"], [inert], .demo-player'));
    });
    expect(invalidFocus).toBe(false);
});

test('@webkit reduced motion stops automatic motion but keeps explicit demo controls', async ({ page }) => {
    await openAccessibleLandingPage(page);

    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
        .toBe(true);
    expect(await page.evaluate(() => window.ScrollTrigger?.getAll().length ?? 0)).toBe(0);
    expect(await page.evaluate(() => document.getAnimations()
        .filter(animation => animation.playState === 'running').length)).toBe(0);
    await expect(page.locator('.hero-ticker')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.htk-row').first()).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.demo-carousel__track')).toHaveCSS('transition-duration', '0s');

    await page.evaluate(() => {
        const scrollIntoView = Element.prototype.scrollIntoView;
        window.__demoScrollBehavior = null;
        Element.prototype.scrollIntoView = function (options) {
            if (this.id === 'demos') window.__demoScrollBehavior = options?.behavior ?? null;
            return scrollIntoView.call(this, options);
        };
    });
    await page.locator('[data-demo-target="l3rd-name"]').first()
        .evaluate(element => element.click());
    await expect(page).toHaveURL(/#demo-l3rd-name$/);
    expect(await page.evaluate(() => window.__demoScrollBehavior)).toBe('auto');

    await page.locator('.section-stage').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(page.locator('#stage-sync')).not.toHaveAttribute('data-state', 'live');

    const mainVideoStates = await page.locator('.stage-device__bg-video').evaluateAll(videos => (
        videos.map(video => ({ paused: video.paused, currentTime: video.currentTime }))
    ));
    expect(mainVideoStates.every(state => state.paused && state.currentTime < 0.1)).toBe(true);

    await page.locator('#demo-tab-1').click();
    await expect(page.locator('#demo-slide-1 [data-demo-action="play"]')).toBeEnabled();
    await page.locator('#demo-tab-2').click();
    await expect(page.locator('#demo-slide-2 [data-demo-action="play"]')).toBeEnabled();

    const demoBackgroundVideoCount = await page.locator('.demo-player__iframe')
        .evaluateAll(iframes => iframes.reduce((count, iframe) => (
            count + (iframe.contentDocument?.querySelectorAll('.bg-video').length ?? 0)
        ), 0));
    expect(demoBackgroundVideoCount).toBe(0);

    await page.locator('#stage-toggle').click();
    await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'live');
    await page.locator('#stage-name').fill('Keyboard Presenter');
    await page.locator('#stage-toggle').click();
    await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'ready');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => page.locator('#vendor-ticker-track').evaluate(
        track => track.getAnimations().length
    )).toBe(1);
    await expect.poll(() => page.evaluate(() => window.ScrollTrigger?.getAll().length ?? 0))
        .toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('#vendor-ticker-track').evaluate(
        track => track.getAnimations().length
    )).toBe(0);
    await expect.poll(() => page.evaluate(() => window.ScrollTrigger?.getAll().length ?? 0))
        .toBe(0);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => page.locator('#vendor-ticker-track').evaluate(
        track => track.getAnimations().length
    )).toBe(1);
});
