import {
    loadDemoCatalog,
    resolveSitePath,
    selectHeroThumbnail
} from './demo-catalog.js';

const ALLOWED_THUMBNAIL_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const CARD_WIDTH_PIXELS = 320;
const MINIMUM_ROW_COPIES = 4;
const ROW_VIEWPORT_COVERAGE = 2.25;

function isSafeThumbnailPath(path) {
    if (typeof path !== 'string' || !path || path.startsWith('/')) return false;
    if (path.split('/').includes('..') || path.includes('\\')) return false;

    const extensionIndex = path.lastIndexOf('.');
    const extension = extensionIndex >= 0 ? path.slice(extensionIndex).toLowerCase() : '';

    return ALLOWED_THUMBNAIL_EXTENSIONS.has(extension);
}

async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url.pathname}: ${response.status}`);

    return response.json();
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load ${url.pathname}`));
        image.src = url.href;
    });
}

async function loadHeroExample(example) {
    const manifestUrl = resolveSitePath(example.manifest);
    const manifest = await loadJson(manifestUrl);
    const thumbnail = selectHeroThumbnail(manifest.thumbnails);
    if (!thumbnail || !isSafeThumbnailPath(thumbnail.file)) {
        throw new Error(`${example.id} does not define a safe hero thumbnail`);
    }

    const thumbnailUrl = new URL(thumbnail.file, manifestUrl);
    if (thumbnailUrl.origin !== window.location.origin) {
        throw new Error(`${example.id} thumbnail must use the website origin`);
    }

    await loadImage(thumbnailUrl);

    return {
        id: example.id,
        title: example.title,
        thumbnailUrl
    };
}

function createCard(example) {
    const card = document.createElement('div');
    card.className = 'htk-card';
    card.dataset.demoTarget = example.id;

    const heading = document.createElement('div');
    heading.className = 'htk-card__head';

    const marker = document.createElement('span');
    marker.className = 'htk-card__dot';

    const title = document.createElement('span');
    title.className = 'htk-card__tag';
    title.textContent = example.title;

    const frame = document.createElement('div');
    frame.className = 'htk-card__frame';

    const image = document.createElement('img');
    image.className = 'htk-card__image';
    image.src = example.thumbnailUrl.href;
    image.alt = '';
    image.width = 320;
    image.height = 180;
    image.decoding = 'async';
    image.draggable = false;

    heading.append(marker, title);
    frame.append(image);
    card.append(heading, frame);

    return card;
}

function requiredRowCopies(examples, viewportWidth) {
    const estimatedCopyWidth = examples.length * CARD_WIDTH_PIXELS;
    if (!estimatedCopyWidth) return MINIMUM_ROW_COPIES;

    return Math.max(
        MINIMUM_ROW_COPIES,
        Math.ceil(viewportWidth * ROW_VIEWPORT_COVERAGE / estimatedCopyWidth)
    );
}

function appendRowCopies(row, examples, copyCount) {
    const currentCopyCount = Number(row.dataset.copyCount) || 0;
    for (let copyIndex = currentCopyCount; copyIndex < copyCount; copyIndex += 1) {
        for (const example of examples) row.append(createCard(example));
    }
    row.dataset.copyCount = String(Math.max(currentCopyCount, copyCount));
}

function createRow(examples, durationSeconds, copyCount) {
    const row = document.createElement('div');
    row.className = 'htk-row htk-row--right';
    row.style.animationDuration = `${durationSeconds}s`;
    appendRowCopies(row, examples, copyCount);

    return row;
}

function rotateExamples(examples, offset) {
    const normalizedOffset = offset % examples.length;

    return examples.slice(normalizedOffset).concat(examples.slice(0, normalizedOffset));
}

function mountTicker(examples) {
    const hero = document.querySelector('.section-hero');
    if (!hero || hero.querySelector('.hero-ticker') || !examples.length) return;

    const ticker = document.createElement('div');
    ticker.className = 'hero-ticker';
    ticker.setAttribute('aria-hidden', 'true');

    const diagonal = document.createElement('div');
    diagonal.className = 'hero-ticker__diag';
    const rowDefinitions = [
        { examples, durationSeconds: 95 },
        { examples: [...examples].reverse(), durationSeconds: 135 },
        { examples: rotateExamples(examples, 1), durationSeconds: 175 }
    ];
    const copyCount = requiredRowCopies(examples, hero.clientWidth);
    const rows = rowDefinitions.map(definition => ({
        ...definition,
        row: createRow(definition.examples, definition.durationSeconds, copyCount)
    }));
    diagonal.append(...rows.map(definition => definition.row));
    ticker.append(diagonal);

    const veil = document.createElement('div');
    veil.className = 'hero-ticker__veil';
    hero.prepend(veil);
    hero.prepend(ticker);

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(() => {
            const nextCopyCount = requiredRowCopies(examples, hero.clientWidth);
            for (const definition of rows) {
                appendRowCopies(definition.row, definition.examples, nextCopyCount);
            }
        });
        resizeObserver.observe(hero);
    }
}

async function initialiseTicker() {
    try {
        const catalogue = await loadDemoCatalog();
        const results = await Promise.allSettled(catalogue.examples.map(loadHeroExample));
        const examples = results.flatMap((result, index) => {
            if (result.status === 'fulfilled') return [result.value];
            console.warn(`Skipping hero example ${catalogue.examples[index].id}:`, result.reason);

            return [];
        });
        mountTicker(examples);
    } catch (error) {
        console.warn('Unable to initialise the OGraf hero ticker:', error);
    }
}

initialiseTicker();
