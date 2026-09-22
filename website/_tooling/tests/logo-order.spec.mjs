import { expect, test } from '@playwright/test';

const HERO_FILES = ['adobe.svg', 'blackmagic-design.svg', 'matrox.svg', 'moovit.png'];

async function tickerFiles(track) {
    return track.locator('img').evaluateAll(images => images.map(image =>
        decodeURIComponent(new URL(image.src).pathname.split('/').pop())
    ));
}

async function expectRepeatedSets(track, order) {
    await expect.poll(() => tickerFiles(track)).toEqual(
        expect.arrayContaining(order)
    );
    const files = await tickerFiles(track);
    expect(files.length).toBeGreaterThanOrEqual(order.length * 2);
    expect(files.length % order.length).toBe(0);
    for (let start = 0; start < files.length; start += order.length) {
        expect(files.slice(start, start + order.length)).toEqual(order);
    }
}

for (const source of ['manifest', 'directory fallback']) {
    test(`@mobile @compat vendor ticker shuffles on reload using ${source}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(() => {
            Math.random = () => Number(sessionStorage.getItem('ticker-test-random') || 0);
        });
        await page.route('**/vendor-logos/hero/manifest.json', route => route.fulfill(
            source === 'manifest'
                ? { json: HERO_FILES }
                : { status: 404, body: '' }
        ));
        if (source === 'directory fallback') {
            await page.route('**/vendor-logos/hero/', route => route.fulfill({
                contentType: 'text/html',
                body: HERO_FILES.map(file => `<a href="${file}">${file}</a>`).join('')
            }));
        }

        await page.goto('./');
        const track = page.locator('#vendor-ticker-track');
        const shuffledOrder = ['blackmagic-design.svg', 'matrox.svg', 'moovit.png', 'adobe.svg'];
        await expectRepeatedSets(track, shuffledOrder);
        await expect.poll(() => track.locator('img').evaluateAll(images =>
            images.every(image => image.complete && image.naturalWidth > 0)
        )).toBe(true);

        await page.setViewportSize({ width: 4096, height: 1000 });
        await expect.poll(() => track.evaluate(element =>
            element.scrollWidth >= element.parentElement.clientWidth
        )).toBe(true);
        await expectRepeatedSets(track, shuffledOrder);

        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await expect.poll(() => track.evaluate(element => element.getAnimations().length)).toBe(1);
        const coveredThroughoutLoop = await track.evaluate(element => {
            const animation = element.getAnimations()[0];
            animation.pause();
            const duration = Number(animation.effect.getTiming().duration);
            return [0, 0.5, 0.999].every(progress => {
                animation.currentTime = duration * progress;
                const viewport = element.parentElement.getBoundingClientRect();
                const first = element.firstElementChild.getBoundingClientRect();
                const last = element.lastElementChild.getBoundingClientRect();
                return first.left <= viewport.left + 1 && last.right >= viewport.right - 1;
            });
        });
        expect(coveredThroughoutLoop).toBe(true);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => track.evaluate(element => element.getAnimations().length)).toBe(0);
        await expectRepeatedSets(track, shuffledOrder);

        await page.evaluate(() => sessionStorage.setItem('ticker-test-random', '0.999999'));
        await page.reload();
        await expectRepeatedSets(track, HERO_FILES);
    });
}
