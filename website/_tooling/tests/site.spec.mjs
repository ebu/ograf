import { expect, test } from '@playwright/test';

const PRODUCTION_URL = 'https://ograf.ebu.io/';
const SOCIAL_IMAGE_PATH = 'website/assets/img/ograf-social-preview.png';
const SOCIAL_IMAGE_URL = `${PRODUCTION_URL}${SOCIAL_IMAGE_PATH}`;
const SOCIAL_IMAGE_ALT = 'OGraf logo with the text "The EBU\'s open specification '
    + 'to liberate broadcast graphics" on a dark blue background.';
const SOCIAL_TITLE = 'OGraf - Open HTML Graphics for Broadcast';
const SOCIAL_DESCRIPTION = "The EBU's open specification for HTML broadcast graphics. "
    + 'Build once, run across compatible broadcast, web, and mobile workflows.';

function monitorPage(page) {
    const errors = [];
    const failedSameOriginRequests = [];

    page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (response.url().startsWith('http://127.0.0.1:')
            && response.status() >= 400) {
            failedSameOriginRequests.push(`${response.status()} ${response.url()}`);
        }
    });

    return { errors, failedSameOriginRequests };
}

async function expectPreparedSocialMetadata(page) {
    await expect(page.locator('link[rel="canonical"]'))
        .toHaveAttribute('href', PRODUCTION_URL);
    await expect(page.locator('meta[property="og:type"]'))
        .toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:title"]'))
        .toHaveAttribute('content', SOCIAL_TITLE);
    await expect(page.locator('meta[property="og:description"]'))
        .toHaveAttribute('content', SOCIAL_DESCRIPTION);
    await expect(page.locator('meta[property="og:site_name"]'))
        .toHaveAttribute('content', 'OGraf');
    await expect(page.locator('meta[property="og:url"]'))
        .toHaveAttribute('content', PRODUCTION_URL);
    await expect(page.locator('meta[property="og:image"]'))
        .toHaveAttribute('content', SOCIAL_IMAGE_URL);
    await expect(page.locator('meta[property="og:image:secure_url"]'))
        .toHaveAttribute('content', SOCIAL_IMAGE_URL);
    await expect(page.locator('meta[property="og:image:type"]'))
        .toHaveAttribute('content', 'image/png');
    await expect(page.locator('meta[property="og:image:width"]'))
        .toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]'))
        .toHaveAttribute('content', '630');
    await expect(page.locator('meta[property="og:image:alt"]'))
        .toHaveAttribute('content', SOCIAL_IMAGE_ALT);
    await expect(page.locator('meta[name="twitter:card"]'))
        .toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="twitter:title"]'))
        .toHaveAttribute('content', SOCIAL_TITLE);
    await expect(page.locator('meta[name="twitter:description"]'))
        .toHaveAttribute('content', SOCIAL_DESCRIPTION);
    await expect(page.locator('meta[name="twitter:image"]'))
        .toHaveAttribute('content', SOCIAL_IMAGE_URL);
    await expect(page.locator('meta[name="twitter:image:alt"]'))
        .toHaveAttribute('content', SOCIAL_IMAGE_ALT);

    const imageResponse = await page.request.get(`./${SOCIAL_IMAGE_PATH}`);
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()['content-type']).toContain('image/png');
    const imageDimensions = await page.evaluate(async imagePath => {
        const image = new Image();
        image.src = `./${imagePath}`;
        await image.decode();

        return { width: image.naturalWidth, height: image.naturalHeight };
    }, SOCIAL_IMAGE_PATH);
    expect(imageDimensions).toEqual({ width: 1200, height: 630 });

    const structuredData = JSON.parse(
        await page.locator('script[type="application/ld+json"]').textContent()
    );
    expect(structuredData).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'OGraf',
        url: PRODUCTION_URL,
        publisher: {
            '@type': 'Organization',
            name: 'European Broadcasting Union'
        }
    });
}

async function openLandingPage(page) {
    const monitor = monitorPage(page);
    await page.goto('./');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page.locator('.logo-grid__item')).not.toHaveCount(0);
    await expect(page.locator('.hero__badge')).toHaveCount(2);
    await expect(page.locator('.hero__badge').nth(1)).toContainText('v1');
    await expect(page.locator('.hero__badge').nth(1)).toContainText('Server API · Stable');
    await expect(page.locator('.status-card')).toHaveCount(2);
    await expect(page.locator('.status-card').nth(1)).toContainText('Published 2026-08-13');
    await expect(page.locator('.status-card').nth(1))
        .toContainText('Read the Server API specification');
    await expect(page.locator('link[href^="website/css/style.css"]'))
        .toHaveAttribute('href', /style\.css\?v=\d+$/);
    await expect(page.locator('script[src^="website/js/demo-carousel.js"]'))
        .toHaveAttribute('src', /demo-carousel\.js\?v=\d+$/);
    await expect(page.locator('body')).not.toContainText('Mid-2026');
    await expect(page.locator('body')).not.toContainText('Draft – Published');
    return monitor;
}

async function expectCleanPage(monitor) {
    expect(monitor.errors, 'console and page errors').toEqual([]);
    expect(monitor.failedSameOriginRequests, 'same-origin HTTP errors').toEqual([]);
}

async function readDownload(download) {
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);

    return Buffer.concat(chunks);
}

function listStoredZipFiles(archive) {
    const files = [];
    let offset = 0;

    while (offset + 4 <= archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
        expect(archive.readUInt16LE(offset + 8), 'ZIP compression method').toBe(0);
        const size = archive.readUInt32LE(offset + 18);
        const fileNameLength = archive.readUInt16LE(offset + 26);
        const extraLength = archive.readUInt16LE(offset + 28);
        const fileNameStart = offset + 30;
        const contentsStart = fileNameStart + fileNameLength + extraLength;
        files.push(archive.subarray(fileNameStart, contentsStart).toString('utf8'));
        offset = contentsStart + size;
    }

    return files;
}

test('social metadata uses the approved preview image', async ({ page }) => {
    const monitor = monitorPage(page);
    await page.goto('./');
    await expectPreparedSocialMetadata(page);
    await expectCleanPage(monitor);
});

test('hero thumbnail selection prefers a suitable 16:9 source', async ({ page }) => {
    await page.goto('./');
    const selected = await page.evaluate(async () => {
        const { selectHeroThumbnail } = await import('./website/js/demo-catalog.js');

        return {
            sized: selectHeroThumbnail([
                { file: 'portrait.webp', resolution: { width: 1080, height: 1920 } },
                { file: 'full-hd.webp', resolution: { width: 1920, height: 1080 } },
                { file: 'hd.webp', resolution: { width: 1280, height: 720 } },
                { file: 'small.webp', resolution: { width: 480, height: 270 } }
            ]),
            unspecified: selectHeroThumbnail([
                { file: 'first.webp' },
                { file: 'second.webp' }
            ])
        };
    });

    expect(selected.sized).toEqual({
        file: 'hd.webp',
        resolution: { width: 1280, height: 720 }
    });
    expect(selected.unspecified).toEqual({ file: 'first.webp' });
});

test('hero ticker covers ultrawide viewports throughout its loop', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 1440 });
    const monitor = await openLandingPage(page);
    const rows = page.locator('.htk-row');
    await expect(rows).toHaveCount(3);
    await expect.poll(() => rows.first().locator('.htk-card').count())
        .toBeGreaterThanOrEqual(27);

    const coverageByPhase = await page.evaluate(() => [0, 0.5, 0.999].map(phase => (
        [...document.querySelectorAll('.htk-row')].map(row => {
            const animation = row.getAnimations()[0];
            const duration = Number(animation.effect.getTiming().duration);
            animation.pause();
            animation.currentTime = duration * phase;
            const bounds = row.getBoundingClientRect();

            return { left: bounds.left, right: bounds.right };
        })
    )));

    for (const phaseCoverage of coverageByPhase) {
        for (const rowCoverage of phaseCoverage) {
            expect(rowCoverage.left).toBeLessThanOrEqual(0);
            expect(rowCoverage.right).toBeGreaterThanOrEqual(3840);
        }
    }
    await expectCleanPage(monitor);
});

test('@mobile hero uses example thumbnails and stable demo deep links', async ({ page }) => {
    const monitor = await openLandingPage(page);
    await expect(page.locator('.hero-ticker')).toHaveAttribute('aria-hidden', 'true');

    const heroExamples = await page.evaluate(async () => {
        const {
            loadDemoCatalog,
            resolveSitePath,
            selectHeroThumbnail: selectThumbnail
        } = await import('./website/js/demo-catalog.js');
        const catalogue = await loadDemoCatalog();

        return Promise.all(catalogue.examples.map(async example => {
            const manifestUrl = resolveSitePath(example.manifest);
            const manifest = await fetch(manifestUrl).then(response => response.json());
            const thumbnail = selectThumbnail(manifest.thumbnails);

            return {
                id: example.id,
                title: example.title,
                url: new URL(thumbnail.file, manifestUrl).href,
                resolution: thumbnail.resolution ?? null
            };
        }));
    });

    await expect(page.locator('.htk-card')).toHaveCount(heroExamples.length * 12);
    for (const example of heroExamples) {
        const cards = page.locator(`.htk-card[data-demo-target="${example.id}"]`);
        await expect(cards).toHaveCount(12);
        await expect(cards.first().locator('.htk-card__tag')).toHaveText(example.title);

        const image = cards.first().locator('.htk-card__image');
        await expect(image).toHaveAttribute('src', example.url);
        await expect.poll(() => image.evaluate(element => element.complete)).toBe(true);
        const dimensions = await image.evaluate(element => ({
            width: element.naturalWidth,
            height: element.naturalHeight
        }));
        if (example.resolution) expect(dimensions).toEqual(example.resolution);

        const response = await page.request.get(example.url);
        expect(response.ok()).toBeTruthy();
        expect(response.headers()['content-type']).toMatch(/^image\//);
        expect((await response.body()).byteLength).toBeLessThanOrEqual(500_000);
    }

    for (const exampleId of heroExamples.map(example => example.id)) {
        await page.locator(`[data-demo-target="${exampleId}"]`).first()
            .evaluate(element => element.click());
        await expect(page).toHaveURL(new RegExp(`#demo-${exampleId}$`));
        await expect(page.locator('.demo-carousel__slide.is-active'))
            .toHaveAttribute('data-example-id', exampleId);
    }

    await page.evaluate(() => history.back());
    await expect(page).toHaveURL(/#demo-headline$/);
    await expect(page.locator('.demo-carousel__slide.is-active'))
        .toHaveAttribute('data-example-id', 'headline');

    await page.evaluate(() => history.forward());
    await expect(page).toHaveURL(/#demo-weather$/);
    await expect(page.locator('.demo-carousel__slide.is-active'))
        .toHaveAttribute('data-example-id', 'weather');

    await page.goto('./#demo-weather');
    await expect(page.locator('.demo-carousel__slide.is-active'))
        .toHaveAttribute('data-example-id', 'weather');
    await expect(page.locator('#demo-slide-5 .demo-player__iframe')).toHaveAttribute(
        'data-loaded-src',
        'website/demo-player/index.html?example=weather'
    );
    await expectCleanPage(monitor);
});

test('@mobile navigation, manifests, and runtime requests work', async ({ page }) => {
    const monitor = await openLandingPage(page);
    const toggle = page.locator('#nav-toggle');

    if (await toggle.isVisible()) {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#site-nav')).toHaveAttribute('aria-hidden', 'false');
        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    } else {
        await expect(page.locator('#site-nav')).toBeVisible();
    }

    const moduleResponse = await page.request.get(
        './v1/examples/responsive-lower-third/graphic.mjs'
    );
    expect(moduleResponse.ok()).toBeTruthy();
    expect(moduleResponse.headers()['content-type']).toContain('text/javascript');
    await expectCleanPage(monitor);
});

test('heavy demo media loads only when requested', async ({ page }) => {
    const sameOriginRequests = [];
    page.on('request', request => {
        if (request.url().startsWith('http://127.0.0.1:')) {
            sameOriginRequests.push(new URL(request.url()).pathname);
        }
    });

    const monitor = await openLandingPage(page);
    const stageSources = page.locator('.stage-device__bg-video source');
    const deferredFrames = page.locator('.demo-player__iframe[data-src]');
    const carouselBackgrounds = await page.evaluate(async () => {
        const response = await fetch('website/demo-catalog.json');
        const catalogue = await response.json();

        return catalogue.examples.map(example => ({
            id: example.id,
            background: example.presentation.background ?? null
        }));
    });

    await expect(stageSources).toHaveCount(6);
    expect(carouselBackgrounds).toEqual([
        {
            id: 'scoreboard',
            background: {
                type: 'image',
                src: 'website/assets/img/bg-stadium.webp',
                overlay: 'rgba(4, 7, 18, 0.6)'
            }
        },
        {
            id: 'responsive-lower-third',
            background: {
                type: 'image',
                src: 'website/assets/img/bg-interview.webp',
                overlay: 'rgba(4, 7, 18, 0.18)'
            }
        },
        {
            id: 'l3rd-name',
            background: {
                type: 'image',
                src: 'website/assets/img/bg-newsroom.jpg',
                overlay: 'rgba(4, 7, 18, 0.12)'
            }
        },
        { id: 'bar-chart', background: null },
        {
            id: 'headline',
            background: {
                type: 'image',
                src: 'website/assets/img/bg-interview.webp',
                overlay: 'rgba(4, 7, 18, 0.18)'
            }
        },
        { id: 'weather', background: null }
    ]);
    for (const source of await stageSources.all()) {
        await expect(source).not.toHaveAttribute('src');
        await expect(source).toHaveAttribute('data-src', /Background-Interview-Video-720/);
    }
    await expect(deferredFrames).toHaveCount(6);
    expect(sameOriginRequests.some(path => path.includes('Background-Interview-Video-720')))
        .toBe(false);
    expect(sameOriginRequests.some(
        path => path.endsWith('/v1/examples/l3rd-name/graphic.mjs')
            || path.includes('/v1/examples/l3rd-name/lib/')
    )).toBe(false);
    expect(sameOriginRequests.some(
        path => path.endsWith('/website/demo-player/index.html')
    )).toBe(false);

    await page.locator('.section-stage').scrollIntoViewIfNeeded();
    await expect.poll(() => sameOriginRequests.some(
        path => path.includes('Background-Interview-Video-720')
    )).toBe(true);

    await page.locator('#demos').scrollIntoViewIfNeeded();
    await expect(page.locator('#sb-iframe')).toHaveAttribute(
        'data-loaded-src',
        'website/demo-player/index.html?example=scoreboard'
    );
    await expect(page.locator('#sb-play')).toBeEnabled();

    await page.locator('#demo-tab-1').click();
    const l3rdFrame = page.locator('#demo-slide-1 .demo-player__iframe');
    await expect(l3rdFrame).toHaveAttribute(
        'data-loaded-src',
        'website/demo-player/index.html?example=l3rd-name'
    );
    await expect(page.locator('#demo-slide-1 [data-demo-action="play"]')).toBeEnabled();
    await expect(page.locator('#demo-slide-2 .demo-player__iframe'))
        .not.toHaveAttribute('data-loaded-src');

    await expect(page.locator('[data-lucide]')).not.toHaveCount(0);
    await expect(page.locator('i[data-lucide]')).toHaveCount(0);
    await expectCleanPage(monitor);
});

test('multi-device stage fits compact landscape viewports', async ({ page }) => {
    const compactViewports = [
        { width: 1260, height: 802 },
        { width: 1024, height: 768 }
    ];

    for (const viewport of compactViewports) {
        await page.setViewportSize(viewport);
        const monitor = await openLandingPage(page);
        const section = page.locator('.section-stage');
        const siteHeader = page.locator('.site-header');
        const tv = page.locator('.stage-device--tv');
        const tablet = page.locator('.stage-device--tablet');
        const phone = page.locator('.stage-device--phone');
        const controls = page.locator('.stage__controls');
        const deviceLabels = page.locator('.stage-device__label');

        await section.scrollIntoViewIfNeeded();
        await expect(deviceLabels).toHaveCount(3);
        await expect(deviceLabels.first()).toBeHidden();
        const sectionPadding = await section.evaluate(element => {
            const style = getComputedStyle(element);

            return {
                top: parseFloat(style.paddingTop),
                bottom: parseFloat(style.paddingBottom)
            };
        });
        expect(sectionPadding.top).toBeGreaterThanOrEqual(32);
        expect(sectionPadding.bottom).toBeGreaterThanOrEqual(32);

        const sectionBox = await section.boundingBox();
        const headerBox = await siteHeader.boundingBox();
        const tvBox = await tv.boundingBox();
        const tabletBox = await tablet.boundingBox();
        const phoneBox = await phone.boundingBox();
        const controlsBox = await controls.boundingBox();

        expect(sectionBox).not.toBeNull();
        expect(headerBox).not.toBeNull();
        expect(tvBox).not.toBeNull();
        expect(tabletBox).not.toBeNull();
        expect(phoneBox).not.toBeNull();
        expect(controlsBox).not.toBeNull();
        expect(sectionBox.height).toBeLessThanOrEqual(viewport.height - headerBox.height + 1);
        expect(controlsBox.y + controlsBox.height)
            .toBeLessThanOrEqual(sectionBox.y + sectionBox.height + 1);

        const tabletOverlap = tabletBox.x + tabletBox.width - tvBox.x;
        expect(tabletOverlap).toBeGreaterThan(0);
        expect(tabletOverlap).toBeLessThanOrEqual(16);

        const lowestDeviceEdge = Math.max(
            tvBox.y + tvBox.height,
            tabletBox.y + tabletBox.height,
            phoneBox.y + phoneBox.height
        );
        expect(controlsBox.y - lowestDeviceEdge).toBeGreaterThanOrEqual(8);

        const pageWidth = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth
        }));
        expect(pageWidth.scrollWidth).toBe(pageWidth.clientWidth);
        await expectCleanPage(monitor);
    }
});

test('@compat stage and carousel example controls run', async ({ browserName, page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const monitor = await openLandingPage(page);

    const stageButton = page.locator('#stage-toggle');
    await expect(stageButton).toBeEnabled();
    await stageButton.click();
    await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'live');
    await page.locator('#stage-name').fill('Updated Presenter');
    await stageButton.click();
    await expect(page.locator('#stage-sync')).toHaveAttribute('data-state', 'ready');

    await page.locator('#demos').scrollIntoViewIfNeeded();
    await expect(page.locator('#sb-play')).toBeEnabled();
    await page.locator('#sb-play').click();
    await expect(page.locator('#sb-status')).toHaveAttribute('data-state', 'playing');
    await page.locator('#sb-next').click();
    await expect(page.locator('#sb-status')).toHaveText('Live');
    await expect(page.locator('#sb-next')).toHaveText('Half-Time');
    await page.locator('#sb-home').fill('EBU');
    await page.locator('#sb-update').click();
    await page.locator('#sb-stop').click();
    await expect(page.locator('#sb-status')).toHaveAttribute('data-state', 'ready');

    const controllerNames = browserName === 'webkit'
        ? ['l3rd-name', 'responsive-lower-third', 'headline']
        : [
            'l3rd-name',
            'responsive-lower-third',
            'bar-chart',
            'headline',
            'weather'
        ];
    for (const controllerName of controllerNames) {
        await page.locator(
            `.demo-carousel__dot[data-example-id="${controllerName}"]`
        ).click();
        const controller = page.locator(`[data-demo-controller="${controllerName}"]`);
        const playButton = controller.locator('[data-demo-action="play"]');

        await expect(controller.locator('xpath=ancestor::*[contains(@class, "demo-carousel__slide")]'))
            .toHaveClass(/is-active/);
        await playButton.scrollIntoViewIfNeeded();
        await expect(playButton).toBeVisible();
        await expect(playButton).toBeEnabled();
        await playButton.click();
        await expect(controller.locator('[data-demo-status]')).toHaveAttribute(
            'data-state',
            'playing',
            { timeout: 20_000 }
        );
        await controller.locator('[data-demo-field]').first().fill('Updated Demo');
        await controller.locator('[data-demo-action="update"]').click();
        const customAction = controller.locator('[data-demo-custom-action]');
        if (await customAction.count()) {
            await expect(customAction).toBeEnabled();
            await customAction.click();
        }
        await controller.locator('[data-demo-action="stop"]').click();
        await expect(controller.locator('[data-demo-status]')).toHaveAttribute(
            'data-state',
            'ready',
            { timeout: 20_000 }
        );
    }

    await expectCleanPage(monitor);
});

test('stopping a demo disposes and recreates its graphic for replay', async ({ page }) => {
    const monitor = await openLandingPage(page);
    await page.locator('#demos').scrollIntoViewIfNeeded();

    const demoCases = [
        {
            tabIndex: 0,
            controller: '.demo-card--scoreboard',
            play: '#sb-play',
            stop: '#sb-stop',
            status: '#sb-status'
        },
        {
            tabIndex: 4,
            controller: '[data-demo-controller="headline"]',
            play: '[data-demo-action="play"]',
            stop: '[data-demo-action="stop"]',
            status: '[data-demo-status]'
        }
    ];

    for (const demoCase of demoCases) {
        await page.locator('.demo-carousel__dot').nth(demoCase.tabIndex).click();
        const controller = page.locator(demoCase.controller);
        const iframe = controller.locator('[data-demo-iframe], #sb-iframe');
        const playButton = controller.locator(demoCase.play);
        const stopButton = controller.locator(demoCase.stop);
        const status = controller.locator(demoCase.status);

        await expect(playButton).toBeEnabled();
        await playButton.click();
        await expect(status).toHaveAttribute('data-state', 'playing');
        await iframe.evaluate(frame => {
            const graphic = frame.contentWindow.document.querySelector('#graphic');
            const dispose = graphic.dispose.bind(graphic);
            frame.contentWindow.__stoppedGraphic = graphic;
            frame.contentWindow.__disposeCalls = 0;
            graphic.dispose = async (...args) => {
                frame.contentWindow.__disposeCalls += 1;

                return dispose(...args);
            };
        });

        await stopButton.click();
        await expect(status).toHaveAttribute('data-state', 'ready');
        await expect.poll(() => iframe.evaluate(frame => ({
            disposeCalls: frame.contentWindow.__disposeCalls,
            replaced: frame.contentWindow.document.querySelector('#graphic')
                !== frame.contentWindow.__stoppedGraphic,
            previousDisconnected: !frame.contentWindow.__stoppedGraphic.isConnected
        }))).toEqual({
            disposeCalls: 1,
            replaced: true,
            previousDisconnected: true
        });

        await playButton.click();
        await expect(status).toHaveAttribute('data-state', 'playing');
        await stopButton.click();
        await expect(status).toHaveAttribute('data-state', 'ready');
    }

    await expectCleanPage(monitor);
});

test('@mobile demo carousel adapts and offers valid OGraf packages', async ({ page }) => {
    const monitor = await openLandingPage(page);
    const carouselViewport = page.locator('.demo-carousel__viewport');
    const carouselTrack = page.locator('.demo-carousel__track');
    const activeSlide = page.locator('.demo-carousel__slide.is-active');
    const player = activeSlide.locator('.demo-player');
    const controls = activeSlide.locator('.demo-controls');
    const viewportSize = page.viewportSize();

    await page.locator('#demos').scrollIntoViewIfNeeded();
    await expect(carouselViewport).toBeVisible();
    await expect(page.locator('.demo-carousel__slide')).toHaveCount(6);
    await expect(page.locator('.demo-carousel__dot')).toHaveCount(6);
    await expect(page.locator('.demo-card__tag')).toHaveCount(0);

    for (const chromePart of ['.demo-card__header', '.demo-aspect-bar']) {
        await expect(activeSlide.locator(chromePart)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    }

    const viewportBox = await carouselViewport.boundingBox();
    const firstSlideBox = await page.locator('.demo-carousel__slide').nth(0).boundingBox();
    const secondSlideBox = await page.locator('.demo-carousel__slide').nth(1).boundingBox();
    const minimumVisibleNeighbour = viewportSize.width <= 640
        ? 12
        : viewportSize.width <= 900 ? 60 : 80;
    expect(viewportBox).not.toBeNull();
    expect(firstSlideBox.x).toBeGreaterThan(viewportBox.x);
    if (viewportSize.width <= 640) {
        expect(firstSlideBox.width).toBeGreaterThanOrEqual(viewportSize.width - 48);
        const navigationBox = await page.locator('.demo-carousel__dots').boundingBox();
        expect(navigationBox.y + navigationBox.height).toBeLessThanOrEqual(viewportBox.y);
    }
    expect(viewportBox.x + viewportBox.width - secondSlideBox.x)
        .toBeGreaterThanOrEqual(minimumVisibleNeighbour);
    const maskImages = await carouselViewport.evaluate(element => {
        const styles = getComputedStyle(element);

        return [styles.maskImage, styles.webkitMaskImage];
    });
    expect(maskImages.some(value => value.includes('linear-gradient'))).toBe(true);
    await expect(page.locator('.demo-carousel__slide').nth(1)).toHaveCSS('opacity', '0.58');

    await page.locator('.demo-carousel__dot').nth(1).click();
    await expect.poll(async () => {
        const previousBox = await page.locator('.demo-carousel__slide').nth(0).boundingBox();
        const nextBox = await page.locator('.demo-carousel__slide').nth(2).boundingBox();
        const previousVisibleWidth = previousBox.x + previousBox.width - viewportBox.x;
        const nextVisibleWidth = viewportBox.x + viewportBox.width - nextBox.x;

        return Math.min(previousVisibleWidth, nextVisibleWidth);
    }).toBeGreaterThanOrEqual(minimumVisibleNeighbour);

    await page.locator('.demo-carousel__dot').nth(0).click();
    await expect(activeSlide).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('.demo-carousel__slide').nth(1)).toHaveAttribute('aria-hidden', 'true');
    await carouselTrack.evaluate(async element => {
        const animations = element.getAnimations();

        await Promise.allSettled(animations.map(animation => animation.finished));
    });

    const playerBox = await player.boundingBox();
    const controlsBox = await controls.boundingBox();
    const cardBox = await activeSlide.locator('.demo-card').boundingBox();

    expect(viewportSize).not.toBeNull();
    expect(playerBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(cardBox).not.toBeNull();

    if (viewportSize.width <= 640) {
        expect(Math.abs(viewportBox.height - cardBox.height)).toBeLessThan(1);
        const formatOptionsBox = await activeSlide.locator(
            '.demo-aspect-bar__options'
        ).boundingBox();
        expect(formatOptionsBox.x).toBeGreaterThanOrEqual(cardBox.x);
        expect(formatOptionsBox.x + formatOptionsBox.width)
            .toBeLessThanOrEqual(cardBox.x + cardBox.width);

        const actionButtons = activeSlide.locator('.demo-controls__actions .btn');
        const firstActionBox = await actionButtons.nth(0).boundingBox();
        const secondActionBox = await actionButtons.nth(1).boundingBox();
        expect(Math.abs(firstActionBox.y - secondActionBox.y)).toBeLessThan(1);
        expect(secondActionBox.x).toBeGreaterThan(firstActionBox.x);
    }

    const hasSideControls = viewportSize.width >= 901;
    if (hasSideControls) {
        expect(controlsBox.x).toBeGreaterThanOrEqual(playerBox.x + playerBox.width - 1);
        expect(cardBox.height).toBeLessThan(viewportSize.height - 64);
    } else {
        expect(controlsBox.y).toBeGreaterThanOrEqual(playerBox.y + playerBox.height - 1);
        expect(playerBox.height).toBeLessThan(viewportSize.height - 64);
    }

    const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
    }));
    expect(pageWidth.scrollWidth).toBe(pageWidth.clientWidth);

    const expectedDownloads = [
        {
            name: 'ograf-example-scoreboard.zip',
            files: [
                'README.md',
                'graphic.mjs',
                'scoreboard.ograf.json',
                'thumbnail.webp'
            ]
        },
        {
            name: 'ograf-example-l3rd-name.zip',
            files: [
                'README.md',
                'graphic.mjs',
                'l3rd.ograf.json',
                'lib/CSSPlugin.js',
                'lib/TextPlugin.js',
                'lib/gsap-core.js',
                'lib/gsap.min.js',
                'lib/ograf-logo-app.svg',
                'lib/utils/strings.js',
                'thumbnail.webp'
            ]
        },
        {
            name: 'ograf-example-responsive-lower-third.zip',
            files: [
                'README.md',
                'graphic.mjs',
                'responsive-lower-third.ograf.json',
                'thumbnail.webp'
            ]
        },
        {
            name: 'ograf-example-bar-chart.zip',
            files: [
                'README.md',
                'bar-chart.ograf.json',
                'graphic.mjs',
                'lib/animation.json',
                'lib/lottie-web.esm.mjs',
                'thumbnail.png'
            ]
        },
        {
            name: 'ograf-example-headline.zip',
            files: [
                'README.md',
                'graphic.mjs',
                'headline.ograf.json',
                'lib/animation.json',
                'lib/lottie-web.esm.mjs',
                'thumbnail.jpg'
            ]
        },
        {
            name: 'ograf-example-weather.zip',
            files: [
                'README.md',
                'graphic.mjs',
                'lib/animation.json',
                'lib/images/image_0.jpg',
                'lib/lottie-web.esm.mjs',
                'thumbnail.jpg',
                'weather.ograf.json'
            ]
        }
    ];
    await expect(page.locator('.demo-card__download')).toHaveCount(expectedDownloads.length);
    for (let index = 0; index < expectedDownloads.length; index += 1) {
        await page.locator('.demo-carousel__dot').nth(index).click();
        const link = page.locator('.demo-carousel__slide').nth(index)
            .locator('.demo-card__download');
        const downloadPromise = page.waitForEvent('download');
        await link.click();
        const download = await downloadPromise;
        const archive = await readDownload(download);

        expect(download.suggestedFilename()).toBe(expectedDownloads[index].name);
        expect(archive.subarray(0, 4).toString('hex')).toBe('504b0304');
        expect(listStoredZipFiles(archive)).toEqual(expectedDownloads[index].files);
    }

    await expectCleanPage(monitor);
});

test('carousel demos share a stable player and card height on compact laptops', async ({ page }) => {
    await page.setViewportSize({ width: 1123, height: 549 });
    const monitor = await openLandingPage(page);
    const formats = [
        { ratio: '16/9', width: '1920px', height: '1080px' },
        { ratio: '4/3', width: '1440px', height: '1080px' },
        { ratio: '1/1', width: '1080px', height: '1080px' },
        { ratio: '9/16', width: '1080px', height: '1920px' }
    ];

    async function expectStableHeight(card) {
        const stage = card.locator('.demo-player-stage');
        const player = card.locator('.demo-player');
        const iframe = card.locator('.demo-player__iframe');
        const initialStageBox = await stage.boundingBox();

        for (const format of formats) {
            await card.locator(`.demo-aspect-btn[data-ratio="${format.ratio}"]`).click();
            await expect(player).toHaveAttribute('data-ratio', format.ratio);
            await expect(iframe).toHaveCSS('width', format.width);
            await expect(iframe).toHaveCSS('height', format.height);

            const stageBox = await stage.boundingBox();
            const playerBox = await player.boundingBox();
            expect(Math.abs(stageBox.height - initialStageBox.height)).toBeLessThan(1);
            expect(Math.abs(playerBox.height - initialStageBox.height)).toBeLessThan(1);
        }
    }

    await page.locator('#demos').scrollIntoViewIfNeeded();

    const carouselDimensions = [];
    const carouselTabs = page.locator('.demo-carousel__dot');
    const carouselTabCount = await carouselTabs.count();
    for (let index = 0; index < carouselTabCount; index += 1) {
        await carouselTabs.nth(index).click();
        await expect(page.locator('.demo-carousel__slide').nth(index)).toHaveClass(/is-active/);
        const activeCard = page.locator('.demo-carousel__slide.is-active .demo-card');
        carouselDimensions.push(await activeCard.evaluate(card => {
            const cardBox = card.getBoundingClientRect();
            const aspectBox = card.querySelector('.demo-aspect-bar').getBoundingClientRect();
            const stageBox = card.querySelector('.demo-player-stage').getBoundingClientRect();

            return {
                cardHeight: cardBox.height,
                aspectHeight: aspectBox.height,
                stageHeight: stageBox.height,
                stageTop: stageBox.top - cardBox.top,
                stageBottom: cardBox.bottom - stageBox.bottom
            };
        }));
    }
    for (const property of ['cardHeight', 'aspectHeight', 'stageHeight', 'stageTop', 'stageBottom']) {
        const values = carouselDimensions.map(dimensions => dimensions[property]);
        expect(
            Math.max(...values) - Math.min(...values),
            `${property} should remain aligned across every carousel card`
        ).toBeLessThan(1);
    }

    await carouselTabs.nth(0).click();
    await expectStableHeight(page.locator('.demo-card--scoreboard'));

    await carouselTabs.nth(2).click();
    const responsiveLowerThird = page.locator('[data-demo-controller="responsive-lower-third"]');
    await expect(responsiveLowerThird.locator('[data-demo-action="play"]')).toBeEnabled();
    await expectStableHeight(responsiveLowerThird);
    await expect(
        responsiveLowerThird.locator('.demo-player__iframe').contentFrame().locator('#graphic')
    ).toHaveAttribute('data-layout', 'portrait');

    await expectCleanPage(monitor);
});

test('@mobile landscape phones retain a complete demo frame', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const monitor = await openLandingPage(page);
    const player = page.locator('.demo-carousel__slide.is-active .demo-player');

    await page.locator('#demos').scrollIntoViewIfNeeded();
    const playerBox = await player.boundingBox();
    expect(playerBox).not.toBeNull();
    expect(playerBox.height).toBeLessThan(390 - 64);

    const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
    }));
    expect(pageWidth.scrollWidth).toBe(pageWidth.clientWidth);
    await expectCleanPage(monitor);
});

test('video is private until consent and uses only youtube-nocookie', async ({ page }) => {
    const thirdPartyRequests = [];
    await page.route('https://www.youtube-nocookie.com/**', async route => {
        thirdPartyRequests.push(route.request().url());
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Video</title>' });
    });

    const monitor = await openLandingPage(page);
    expect(thirdPartyRequests).toEqual([]);
    await page.locator('.section-video__consent').click();
    await expect(page.locator('.section-video__embed iframe')).toHaveAttribute(
        'src',
        /youtube-nocookie\.com\/embed\/u4wruk2QTs0/
    );
    await expect.poll(() => thirdPartyRequests.length).toBeGreaterThan(0);
    expect(thirdPartyRequests.every(url => url.startsWith('https://www.youtube-nocookie.com/'))).toBeTruthy();
    await expectCleanPage(monitor);
});

test('normative documentation routes remain available', async ({ page }) => {
    const paths = process.env.REQUIRE_JEKYLL_OUTPUT === '1'
        ? [
            './v1/specification/docs/Specification.html',
            './v1/specification/docs/Specification_Server_API.html',
            './v1/specification/json-schemas/graphics/schema.json',
            './v1/specification/open-api/docs/',
            './CHANGELOG.html'
        ]
        : [
            './v1/specification/docs/Specification.md',
            './v1/specification/docs/Specification_Server_API.md',
            './v1/specification/json-schemas/graphics/schema.json',
            './v1/specification/open-api/docs/',
            './CHANGELOG.md'
        ];

    for (const path of paths) {
        const response = await page.request.get(path);
        expect(response.ok(), path).toBeTruthy();
    }
});

test('development server blocks path traversal', async ({ page }) => {
    const response = await page.request.get('./%2e%2e%2f%2e%2e%2fCNAME');
    expect(response.status()).toBe(403);
});
