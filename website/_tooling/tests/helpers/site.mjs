import { expect } from '@playwright/test';

export function monitorPage(page) {
    const errors = [];
    page.on('request', request => {
        const host = new URL(request.url()).hostname;
        if (['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdn.jsdelivr.net'].includes(host)) {
            errors.push(`Unexpected remote runtime dependency: ${request.url()}`);
        }
    });
    page.on('console', message => {
        if (message.type() !== 'error') return;
        const index = errors.push(message.text()) - 1;
        // Firefox may print an Error object as JSHandle@error. Preserve an
        // immediate failure entry, then enrich it with the actual message.
        Promise.all(message.args().map(argument => argument.evaluate(value =>
            value?.message ?? String(value)))).then(values => {
            if (values.length) errors[index] = values.join(' ');
        }).catch(() => { /* Retain original text if the page has already closed. */ });
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (new URL(response.url()).origin === new URL(page.url()).origin && response.status() >= 400) {
            errors.push(`${response.status()} ${response.url()}`);
        }
    });
    return errors;
}

export async function openLandingPage(page, { reducedMotion = false } = {}) {
    const errors = monitorPage(page);
    if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('.htk-card').count()).toBeGreaterThan(0);
    return errors;
}

export async function catalogue(page) {
    const response = await page.request.get(new URL('website/demo-catalog.json', page.url()).href);
    expect(response.ok()).toBeTruthy();
    return response.json();
}

export const slides = page => page.locator('.demo-carousel__slide');
export const tabs = page => page.locator('.demo-carousel__dot');
export const action = (card, name) => card.locator(`[data-demo-action="${name}"], #sb-${name}`);
export const status = card => card.locator('[data-demo-status], #sb-status');

export async function expectPageFits(page) {
    const size = await page.evaluate(() => ({width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth}));
    expect(size.scroll).toBeLessThanOrEqual(size.width + 2);
}

export async function expectBoxFits(locator, container) {
    const bounds = await container.boundingBox();
    const box = await locator.boundingBox();
    const label = await locator.evaluate(node => node.outerHTML.slice(0, 220));
    expect(bounds).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(bounds.x - 2);
    expect(box.y).toBeGreaterThanOrEqual(bounds.y - 2);
    expect(box.x + box.width, label).toBeLessThanOrEqual(bounds.x + bounds.width + 2);
    expect(box.y + box.height, label).toBeLessThanOrEqual(bounds.y + bounds.height + 2);
}

export async function instrumentGraphic(card) {
    await expect(action(card, 'play')).toBeEnabled();
    await card.locator('iframe').evaluate(frame => {
        const graphic = frame.contentDocument.querySelector('#graphic');
        frame.contentWindow.__websiteCalls ??= [];
        for (const name of ['playAction', 'updateAction', 'customAction', 'stopAction', 'dispose']) {
            const method = graphic[name]?.bind(graphic);
            if (!method) continue;
            graphic[name] = async (...args) => {
                const call = { name, args, done: false };
                frame.contentWindow.__websiteCalls.push(call);
                const result = await method(...args);
                call.done = true;
                return result;
            };
        }
    });
}

export const calls = card => card.locator('iframe').evaluate(frame => frame.contentWindow.__websiteCalls ?? []);
export const clearCalls = card => card.locator('iframe').evaluate(frame => { frame.contentWindow.__websiteCalls = []; });
export async function expectCall(card, name) {
    await expect.poll(async () => (await calls(card)).some(call => call.name === name && call.done)).toBe(true);
}
