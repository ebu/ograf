import { expect, test } from '@playwright/test';
import { PNG } from './helpers/content-fixture.mjs';
import { openLandingPage } from './helpers/site.mjs';

for (const explicit of [true, false]) {
    test(`@mobile @compat hero uses ${explicit ? 'the catalogue choice' : 'the non-GIF fallback'}`, async ({ page, baseURL }, testInfo) => {
        const catalogueUrl = new URL('website/demo-catalog.json', baseURL);
        const catalog = await (await page.request.get(catalogueUrl.href)).json();
        const example = catalog.examples[0];
        const manifestUrl = new URL(example.manifest, baseURL);
        const manifest = await (await page.request.get(manifestUrl.href)).json();
        const preferred = 'fixture-editorial.png';
        const fallback = 'fixture-fallback.png';
        const gif = 'fixture-never.gif';
        manifest.thumbnails = [
            { file: gif, resolution: { width: 640, height: 360 } },
            { file: fallback, resolution: { width: 1280, height: 720 } },
            { file: preferred, resolution: { width: 200, height: 400 } }
        ];
        if (explicit) example.presentation.heroThumbnail = preferred;
        else delete example.presentation.heroThumbnail;
        let requestedGif = false;
        page.on('request', request => {
            if (request.url() === new URL(gif, manifestUrl).href) requestedGif = true;
        });
        await page.route(catalogueUrl.href, route => route.fulfill({ json: catalog }));
        await page.route(manifestUrl.href, route => route.fulfill({ json: manifest }));
        for (const file of [preferred, fallback]) {
            await page.route(new URL(file, manifestUrl).href, route => route.fulfill({ contentType: 'image/png', body: PNG }));
        }
        const errors = await openLandingPage(page, { reducedMotion: true });
        const image = page.locator(`.htk-card[data-demo-target="${example.id}"] img`).first();
        await expect(image).toHaveAttribute('src', new URL(explicit ? preferred : fallback, manifestUrl).href);
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        expect(requestedGif).toBe(false);
        expect(errors).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath('hero.png'), scale: 'css' });
    });
}
