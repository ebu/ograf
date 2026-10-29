import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { action, expectPageFits, openLandingPage, slides, status, tabs } from './helpers/site.mjs';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoWcagViolations(page, testInfo, label) {
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS)
        .exclude({ fromFrames: ['iframe.demo-player__iframe', 'html'] }).analyze();
    const simplify = entries => entries.map(entry => ({id:entry.id, impact:entry.impact,
        help:entry.help, targets:entry.nodes.map(node => node.target)}));
    if (results.incomplete.length) await testInfo.attach(`axe-incomplete-${label}`, {
        body:JSON.stringify(simplify(results.incomplete), null, 2), contentType:'application/json'
    });
    expect(simplify(results.violations), `WCAG A/AA: ${label}`).toEqual([]);
}

async function expectFocusRing(locator) {
    await expect(locator).toBeFocused();
    const visible = await locator.evaluate(node => {
        const style = getComputedStyle(node);
        return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
            && style.outlineColor !== 'transparent' && style.outlineColor !== 'rgba(0, 0, 0, 0)')
            || style.boxShadow !== 'none';
    });
    expect(visible, 'Keyboard focus must be visible').toBe(true);
}

async function mockVideo(page) {
    await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({
        status:200, contentType:'text/html', body:'<!doctype html><html lang="en"><title>Video</title><body>Video</body></html>'
    }));
}

test('@mobile visible application states have no WCAG A or AA violations', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await mockVideo(page);
    const errors = await openLandingPage(page, { reducedMotion:true });
    for (const tab of await page.locator('.code-block__tab').all()) {
        await tab.click();
        const panel = page.locator(`#${await tab.getAttribute('aria-controls')}`);
        await expect(panel).toBeVisible();
        expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 2)).toBe(true);
    }
    for (const iframe of await slides(page).locator('iframe').all()) {
        await expect(iframe).toHaveAttribute('title', /\S+/);
    }
    await expectNoWcagViolations(page, testInfo, 'initial');
    const nav = page.locator('#nav-toggle');
    if (await nav.isVisible()) {
        await nav.click();
        await expectNoWcagViolations(page, testInfo, 'navigation-open');
        await page.keyboard.press('Escape');
    }
    for (let i = 0; i < await tabs(page).count(); i++) {
        await tabs(page).nth(i).click();
        await expectNoWcagViolations(page, testInfo, `demo-${i}`);
    }
    await page.locator('.section-video__consent').click();
    await expect(page.locator('.section-video__embed iframe')).toBeFocused();
    await expectNoWcagViolations(page, testInfo, 'video-consented');
    expect(errors).toEqual([]);
});

test('@webkit keyboard users can operate navigation, demos, formats and code tabs', async ({ browserName, page }) => {
    await mockVideo(page);
    const errors = await openLandingPage(page, { reducedMotion:true });
    if (browserName === 'webkit') await page.locator('.skip-link').focus();
    else { await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Tab'); }
    await expectFocusRing(page.locator('.skip-link'));
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    const nav = page.locator('#nav-toggle');
    if (await nav.isVisible()) {
        await nav.focus(); await page.keyboard.press('Enter');
        await expect(page.locator('.site-nav__link').first()).toBeFocused();
        await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
        await expect(page.locator('.site-footer')).toHaveAttribute('inert', '');
        await page.keyboard.press('Escape'); await expect(nav).toBeFocused();
    } else {
        await page.locator('.site-nav__link').first().focus();
        await expectFocusRing(page.locator('.site-nav__link').first());
    }
    const demoTabs = tabs(page);
    const count = await demoTabs.count();
    expect(count).toBeGreaterThan(0);
    await demoTabs.first().focus(); await page.keyboard.press('ArrowRight');
    await expect(demoTabs.nth(count > 1 ? 1 : 0)).toBeFocused();
    await expect(demoTabs.nth(count > 1 ? 1 : 0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End'); await expect(demoTabs.last()).toBeFocused();
    await page.keyboard.press('Home'); await expect(demoTabs.first()).toBeFocused();
    if (count > 1) {
        await page.locator('.demo-carousel__btn--next').focus(); await page.keyboard.press('Enter');
        await expect(demoTabs.nth(1)).toHaveAttribute('aria-selected', 'true');
        await expect(count === 2 ? demoTabs.nth(1) : page.locator('.demo-carousel__btn--next')).toBeFocused();
    }
    for (let i = 0; i < count; i++) {
        await demoTabs.nth(i).click();
        const radios = slides(page).nth(i).locator('[role="radio"]');
        const radioCount = await radios.count();
        if (!radioCount) continue;
        await radios.first().focus(); await page.keyboard.press('ArrowRight');
        await expect(radios.nth(radioCount > 1 ? 1 : 0)).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('End'); await expect(radios.last()).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Home'); await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
    }
    const codeTabs = page.locator('.code-block__tab');
    await codeTabs.first().focus(); await page.keyboard.press('ArrowRight');
    const nextCode = codeTabs.nth((await codeTabs.count()) > 1 ? 1 : 0);
    await expect(nextCode).toBeFocused();
    await expect(page.locator(`#${await nextCode.getAttribute('aria-controls')}`)).toBeVisible();
    await demoTabs.first().click();
    const first = slides(page).first();
    await expect(action(first, 'play')).toBeEnabled();
    await action(first, 'play').focus(); await page.keyboard.press('Enter');
    await expect(status(first)).toHaveAttribute('data-state', 'playing');
    if (await action(first, 'update').count()) { await action(first, 'update').focus(); await page.keyboard.press('Enter'); }
    await action(first, 'stop').focus(); await page.keyboard.press('Enter');
    await expect(status(first)).toHaveAttribute('data-state', 'ready');
    await page.locator('.section-video__consent').focus();
    if (browserName === 'firefox') {
        // After the focused Stop button becomes disabled, establish a real
        // keyboard focus transition rather than relying on programmatic focus.
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
    }
    await expectFocusRing(page.locator('.section-video__consent'));
    await page.keyboard.press('Enter');
    await expect(page.locator('.section-video__embed iframe')).toBeFocused();
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[aria-hidden="true"], [inert], .demo-player')))).toBe(false);
    expect(errors).toEqual([]);
});

test('@webkit reduced motion stops automatic movement and preserves controls', async ({ page }) => {
    const errors = await openLandingPage(page, { reducedMotion:true });
    const automaticAnimations = () => page.evaluate(() => document.getAnimations().some(animation => animation.playState === 'running'));
    expect(await automaticAnimations()).toBe(false);
    const target = page.locator('[data-demo-target]').first();
    const id = await target.getAttribute('data-demo-target');
    await page.evaluate(() => {
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function(options) {
            if (this.id === 'demos') window.__scrollBehavior = options?.behavior;
            return original.call(this, options);
        };
    });
    await target.evaluate(node => node.click());
    await expect(page.locator('.demo-carousel__slide.is-active')).toHaveAttribute('data-example-id', id);
    expect(await page.evaluate(() => window.__scrollBehavior)).toBe('auto');
    for (let i = 0; i < await tabs(page).count(); i++) {
        await tabs(page).nth(i).click();
        await expect(action(slides(page).nth(i), 'play')).toBeEnabled();
    }
    const videosPaused = () => page.evaluate(() => [
        ...document.querySelectorAll('video'),
        ...[...document.querySelectorAll('.demo-player__iframe')].flatMap(frame => [...frame.contentDocument.querySelectorAll('video')])
    ].every(video => video.paused));
    expect(await videosPaused()).toBe(true);
    const stage = page.locator('#stage-toggle');
    if (await stage.count()) {
        await page.locator('.section-stage').scrollIntoViewIfNeeded();
        await expect(page.locator('#stage-sync')).not.toHaveAttribute('data-state', 'live');
        await stage.click(); await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'live');
        await stage.click(); await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'ready');
    }
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(automaticAnimations).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(automaticAnimations).toBe(false);
    await expect.poll(videosPaused).toBe(true);
    await expectPageFits(page);
    expect(errors).toEqual([]);
});
