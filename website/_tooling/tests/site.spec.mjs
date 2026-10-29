import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { readZip } from './helpers/read-zip.mjs';
import {
    action, calls, catalogue, clearCalls, expectBoxFits, expectCall, expectPageFits,
    instrumentGraphic, openLandingPage, slides, status, tabs
} from './helpers/site.mjs';

const PRODUCTION = 'https://ograf.ebu.io/';

test('social metadata is complete, consistent and references a working image', async ({ page }) => {
    const errors = await openLandingPage(page);
    const content = async selector => page.locator(selector).getAttribute('content');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', PRODUCTION);
    for (const field of ['title', 'description', 'image', 'image:alt']) {
        const og = await content(`meta[property="og:${field}"]`);
        expect(og?.trim(), `og:${field}`).toBeTruthy();
        expect(await content(`meta[name="twitter:${field}"]`)).toBe(og);
    }
    expect(await content('meta[property="og:url"]')).toBe(PRODUCTION);
    const imageUrl = await content('meta[property="og:image"]');
    expect(new URL(imageUrl).origin).toBe(new URL(PRODUCTION).origin);
    const image = await page.request.get(new URL(imageUrl).pathname.slice(1));
    expect(image.ok()).toBeTruthy();
    expect(image.headers()['content-type']).toMatch(/^image\//);
    const dimensions = await page.evaluate(async path => {
        const img = new Image(); img.src = new URL(path, document.baseURI).href;
        await img.decode(); return {width: img.naturalWidth, height: img.naturalHeight};
    }, new URL(imageUrl).pathname.slice(1));
    expect(dimensions.width).toBe(Number(await content('meta[property="og:image:width"]')));
    expect(dimensions.height).toBe(Number(await content('meta[property="og:image:height"]')));
    const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(structured.url).toBe(PRODUCTION);
    expect(structured.name?.trim()).toBeTruthy();
    expect(errors).toEqual([]);
});

test('@mobile hero cards, carousel and deep links agree with current content', async ({ page }) => {
    const errors = await openLandingPage(page, { reducedMotion: true });
    const catalog = await catalogue(page);
    const ids = catalog.examples.map(example => example.id);
    const actual = await slides(page).evaluateAll(nodes => nodes.map(node => node.dataset.exampleId));
    expect([...actual].sort()).toEqual([...ids].sort());
    expect(await tabs(page).evaluateAll(nodes => nodes.map(node => node.dataset.exampleId))).toEqual(actual);
    await expect(page.locator('.hero-ticker')).toHaveAttribute('aria-hidden', 'true');
    for (const example of catalog.examples) {
        const card = page.locator(`.htk-card[data-demo-target="${example.id}"]`).first();
        await expect(card.locator('.htk-card__tag')).toHaveText(example.title);
        await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        await card.evaluate(node => node.click());
        await expect(page.locator('.demo-carousel__slide.is-active')).toHaveAttribute('data-example-id', example.id);
        await expect(page).toHaveURL(new RegExp(`#demo-${example.id}$`));
    }
    if (ids.length > 1) {
        await page.goBack();
        await expect(page.locator('.demo-carousel__slide.is-active')).toHaveAttribute('data-example-id', ids.at(-2));
        await page.goForward();
        await expect(page.locator('.demo-carousel__slide.is-active')).toHaveAttribute('data-example-id', ids.at(-1));
    }
    await page.reload();
    await expect(page.locator('.demo-carousel__slide.is-active')).toHaveAttribute('data-example-id', ids.at(-1));
    expect(errors).toEqual([]);
});

test('@mobile downloads contain the current package bytes', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = await openLandingPage(page, { reducedMotion: true });
    const catalog = await catalogue(page);
    for (const example of catalog.examples) {
        const tab = page.locator(`.demo-carousel__dot[data-example-id="${example.id}"]`);
        await tab.click();
        const card = page.locator(`.demo-carousel__slide[data-example-id="${example.id}"]`);
        const pending = page.waitForEvent('download');
        await card.locator('[data-example-download]').click();
        const download = await pending;
        expect(download.suggestedFilename()).toBe(example.archiveName);
        const chunks = [];
        for await (const chunk of await download.createReadStream()) chunks.push(chunk);
        const files = readZip(Buffer.concat(chunks));
        expect([...files.keys()].sort()).toEqual(example.files.map(file => file.archive).sort());
        for (const file of example.files) {
            const response = await page.request.get(`./${file.source}`);
            expect(response.ok(), file.source).toBeTruthy();
            const bytes = await response.body();
            expect(files.get(file.archive), file.archive).toEqual(bytes);
            expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
        }
        const manifestEntry = example.files.find(file => file.source === example.manifest);
        expect(manifestEntry).toBeTruthy();
        const manifest = JSON.parse(files.get(manifestEntry.archive).toString('utf8'));
        const main = new URL(manifest.main, `https://package.invalid/${manifestEntry.archive}`).pathname.slice(1);
        expect(files.has(main)).toBe(true);
    }
    expect(errors).toEqual([]);
});

test('@compat stage and every offered demo can play, update, stop and replay', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = await openLandingPage(page, { reducedMotion: true });
    const stageToggle = page.locator('#stage-toggle');
    if (await stageToggle.count()) {
        await stageToggle.click();
        await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'live');
        await stageToggle.click();
        await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'ready');
    }
    for (let index = 0; index < await slides(page).count(); index++) {
        await tabs(page).nth(index).click();
        const card = slides(page).nth(index);
        await instrumentGraphic(card);
        await action(card, 'play').click();
        await expect(status(card)).toHaveAttribute('data-state', 'playing');
        await expectCall(card, 'playAction');
        if (index === 0 || index === (await slides(page).count()) - 1) {
            await card.locator('.demo-card').screenshot({path:testInfo.outputPath(`demo-playing-${index}.png`),scale:'css'});
        }
        await clearCalls(card);
        const update = action(card, 'update');
        if (await update.count()) {
            const fields = card.locator('[data-demo-field], #sb-home, #sb-away');
            for (const field of await fields.all()) {
                const type = await field.getAttribute('type');
                if (await field.evaluate(node => node.tagName === 'SELECT')) {
                    const option = await field.locator('option:not([disabled])').last().getAttribute('value');
                    await field.selectOption(option);
                } else if (type === 'number') {
                    const next = await field.evaluate(node => {
                        const minimum = node.min ? Number(node.min) : 0;
                        const maximum = node.max ? Number(node.max) : minimum + 1;
                        return String(Math.min(maximum, minimum + Number(node.step || 1)));
                    });
                    await field.fill(next);
                } else {
                    // Keep real examples' defaults valid even when their schema
                    // has a pattern/enum. Edited values are covered by a fixture.
                    await field.fill(await field.inputValue());
                }
            }
            const expectedData = await fields.evaluateAll(nodes => Object.fromEntries(nodes.map(node =>
                [node.dataset.demoField || (node.id === 'sb-home' ? 'homeShort' : 'awayShort'),
                    node.dataset.demoField ? (node.dataset.demoValueType === 'number' ? Number(node.value) : node.value)
                        : node.value.toUpperCase().substring(0, 4)])));
            await update.click();
            await expectCall(card, 'updateAction');
            const received = (await calls(card)).find(call => call.name === 'updateAction').args[0].data;
            expect(received).toBeTruthy();
            if (await fields.count()) expect(received).toEqual(expectedData);
        }
        const customButtons = card.locator('[data-demo-custom-action], #sb-goal-home, #sb-goal-away');
        for (const button of await customButtons.all()) {
            await clearCalls(card);
            const expectedId = await button.getAttribute('data-demo-custom-action')
                ?? (await button.getAttribute('id')).replace(/^sb-/, '');
            await button.click();
            await expectCall(card, 'customAction');
            expect((await calls(card)).find(call => call.name === 'customAction').args[0].id).toBe(expectedId);
        }
        await clearCalls(card);
        await card.locator('iframe').evaluate(frame => { frame.contentWindow.__previousGraphic = frame.contentDocument.querySelector('#graphic'); });
        await action(card, 'stop').click();
        await expect(status(card)).toHaveAttribute('data-state', 'ready');
        await expectCall(card, 'stopAction');
        await expectCall(card, 'dispose');
        expect(await card.locator('iframe').evaluate(frame =>
            !frame.contentWindow.__previousGraphic.isConnected
            && frame.contentDocument.querySelector('#graphic') !== frame.contentWindow.__previousGraphic)).toBe(true);
        await instrumentGraphic(card);
        await action(card, 'play').click();
        await expect(status(card)).toHaveAttribute('data-state', 'playing');
        await action(card, 'stop').click();
        await expect(status(card)).toHaveAttribute('data-state', 'ready');
    }
    expect(errors).toEqual([]);
});

test('@mobile navigation and responsive content stay usable', async ({ page, browserName }, testInfo) => {
    // WebKit's four viewport changes plus screenshots can exceed two minutes
    // even after every geometry assertion has passed (see retained traces).
    test.setTimeout(browserName === 'webkit' ? 180_000 : 120_000);
    const errors = await openLandingPage(page, { reducedMotion: true });
    const toggle = page.locator('#nav-toggle');
    if (await toggle.isVisible()) {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#site-nav')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1123,height:549}, {width:1440,height:900}]) {
        await page.setViewportSize(viewport);
        await expectPageFits(page);
        for (let index = 0; index < await slides(page).count(); index++) {
            await tabs(page).nth(index).click();
            const card = slides(page).nth(index);
            await expect(action(card, 'play')).toBeEnabled();
            const content = card.locator('.demo-card');
            await expectBoxFits(card.locator('.demo-player'), content);
            // Measure in one browser call. Hundreds of separate Playwright
            // stability checks are needlessly expensive in mobile WebKit.
            const layoutProblems = await content.evaluate(async container => {
                await new Promise(resolve => requestAnimationFrame(resolve));
                const problems = [];
                for (const node of container.querySelectorAll('button, input, select, .demo-card__title, .demo-field__label')) {
                    if (!node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') continue;
                    // Native scrolling is intentional for desktop control panels.
                    node.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});
                    const box = node.getBoundingClientRect();
                    const bounds = container.getBoundingClientRect();
                    const outside = box.width <= 0 || box.height <= 0
                        || box.left < bounds.left - 2 || box.right > bounds.right + 2
                        || box.top < bounds.top - 2 || box.bottom > bounds.bottom + 2;
                    // Native inputs scroll their editable values; their outer
                    // bounds must fit, while button/label text must also fit.
                    const clipped = (!['INPUT', 'SELECT'].includes(node.tagName)
                        && node.scrollWidth > node.clientWidth + 2)
                        || node.scrollHeight > node.clientHeight + 2;
                    if (outside || clipped) problems.push({element:node.outerHTML.slice(0,180),outside,clipped});
                }
                return problems;
            });
            expect(layoutProblems, `Controls and text must fit at ${viewport.width}px`).toEqual([]);
            for (const format of await card.locator('[data-ratio][role="radio"]').all()) {
                await format.click();
                await expect(format).toHaveAttribute('aria-checked', 'true');
                const frame = await card.locator('iframe').boundingBox();
                expect(frame.width).toBeGreaterThan(0); expect(frame.height).toBeGreaterThan(0);
                const [w,h] = (await format.getAttribute('data-ratio')).split('/').map(Number);
                expect(Math.abs(frame.width / frame.height - w / h)).toBeLessThan(0.02);
            }
        }
        await expectPageFits(page);
        await page.locator('#demos').scrollIntoViewIfNeeded();
        await page.screenshot({ path:testInfo.outputPath(`demos-${viewport.width}.png`),scale:'css' });
    }
    expect(errors).toEqual([]);
});

test('@mobile logos match their manifests and fit their cards', async ({ page }) => {
    const errors = await openLandingPage(page, { reducedMotion: true });
    for (const grid of await page.locator('.logo-grid[data-base]').all()) {
        const base = await grid.getAttribute('data-base');
        const response = await page.request.get(`${base}manifest.json`);
        expect(response.ok()).toBeTruthy();
        const entries = (await response.json()).map(entry => typeof entry === 'string' ? {file:entry} : entry);
        await expect(grid.locator('img')).toHaveCount(entries.length);
        await grid.scrollIntoViewIfNeeded();
        for (const entry of entries) {
            const image = grid.locator(`img[src$="/${entry.file}"]`);
            await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
            await expect(image).toHaveAttribute('alt', entry.name ?? '');
            const item = image.locator('xpath=ancestor::li');
            if (entry.url) await expect(item.locator('a')).toHaveAttribute('href', entry.url);
            await expectBoxFits(image, item);
        }
    }
    expect(errors).toEqual([]);
});

test('@mobile referenced images and backgrounds can be decoded', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await openLandingPage(page, { reducedMotion:true });
    for (let i = 0; i < await tabs(page).count(); i++) {
        await tabs(page).nth(i).click();
        await expect(action(slides(page).nth(i), 'play')).toBeEnabled();
    }
    const failures = await page.evaluate(async () => {
        const urls = new Set();
        const documents = [document, ...[...document.querySelectorAll('.demo-player__iframe')].map(frame => frame.contentDocument)];
        for (const doc of documents) {
            for (const image of doc.images) if (image.src) urls.add(image.src);
            for (const node of doc.querySelectorAll('*')) {
                for (const match of doc.defaultView.getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(match[1]);
            }
        }
        return (await Promise.all([...urls].map(async url => {
            try { const image = new Image(); image.src = url; await image.decode();
                if (!image.naturalWidth || !image.naturalHeight) return url; }
            catch { return url; }
            return null;
        }))).filter(Boolean);
    });
    expect(failures, 'Undecodable referenced images').toEqual([]);
    expect(errors).toEqual([]);
});

test('tickers cover wide viewports throughout their animation', async ({ page }) => {
    const errors = await openLandingPage(page);
    await page.setViewportSize({width:3840,height:1440});
    await expect.poll(() => page.locator('.htk-row').count()).toBeGreaterThan(0);
    for (const row of await page.locator('.htk-row').all()) {
        const coverage = await row.evaluate(node => {
            const animation = node.getAnimations()[0];
            if (!animation) return [];
            animation.pause();
            return [0, 0.5, 0.999].map(phase => {
                animation.currentTime = Number(animation.effect.getTiming().duration) * phase;
                const box = node.getBoundingClientRect();
                return {left:box.left, right:box.right};
            });
        });
        expect(coverage).toHaveLength(3);
        for (const box of coverage) { expect(box.left).toBeLessThanOrEqual(2); expect(box.right).toBeGreaterThanOrEqual(3838); }
    }
    expect(errors).toEqual([]);
});

test('heavy media and players are deferred until their section is requested', async ({ page }) => {
    const requested = [];
    page.on('request', request => requested.push(request.url()));
    const errors = await openLandingPage(page, { reducedMotion: true });
    const videoSources = await page.locator('.stage-device__bg-video source[data-src]').evaluateAll(nodes => nodes.map(node => node.dataset.src));
    for (const source of videoSources) expect(requested.some(url => url.includes(source))).toBe(false);
    expect(requested.some(url => new URL(url).pathname.endsWith('/website/demo-player/index.html'))).toBe(false);
    await page.locator('#demos').scrollIntoViewIfNeeded();
    await expect(action(slides(page).first(), 'play')).toBeEnabled();
    for (const frame of await slides(page).locator('iframe').all()) {
        if (await frame.getAttribute('data-src')) await expect(frame).not.toHaveAttribute('data-loaded-src');
    }
    expect(errors).toEqual([]);
});

test('video requires consent and uses the configured youtube-nocookie video', async ({ page }) => {
    const requests = [];
    await page.route(/https:\/\/(?:[^/]*youtube[^/]*|[^/]*ytimg[^/]*)\//, async route => {
        requests.push(route.request().url());
        await route.fulfill({status:200, contentType:'text/html', body:'<!doctype html><html lang="en"><title>Video</title></html>'});
    });
    const errors = await openLandingPage(page);
    expect(requests).toEqual([]);
    const embed = page.locator('.section-video__embed');
    const id = await embed.getAttribute('data-video-id');
    await embed.locator('.section-video__consent').click();
    const iframe = embed.locator('iframe');
    const url = new URL(await iframe.getAttribute('src'));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe(`/embed/${id}`);
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests.every(url => new URL(url).hostname === 'www.youtube-nocookie.com')).toBe(true);
    expect(errors).toEqual([]);
});

test('documentation routes remain available and development server blocks traversal', async ({ page }) => {
    await page.goto('./');
    const suffix = process.env.REQUIRE_JEKYLL_OUTPUT === '1' ? 'html' : 'md';
    for (const path of [`v1/specification/docs/Specification.${suffix}`, `v1/specification/docs/Specification_Server_API.${suffix}`,
        'v1/specification/json-schemas/graphics/schema.json', 'v1/specification/open-api/docs/', `CHANGELOG.${suffix}`]) {
        expect((await page.request.get(`./${path}`)).ok(), path).toBeTruthy();
    }
    expect((await page.request.get('./%2e%2e%2f%2e%2e%2fCNAME')).status()).toBe(403);
});
