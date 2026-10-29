export const DEMO_CATALOG_URL = new URL('../demo-catalog.json', import.meta.url);
export const SITE_ROOT_URL = new URL('../', DEMO_CATALOG_URL);
const HERO_ASPECT_RATIO = 16 / 9;
const HERO_MINIMUM_WIDTH = 640;

function isPositiveNumber(value) {
    return Number.isFinite(value) && value > 0;
}

function resolutionOf(thumbnail) {
    const width = Number(thumbnail?.resolution?.width);
    const height = Number(thumbnail?.resolution?.height);
    if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;

    return { width, height };
}

function compareThumbnails(left, right) {
    const leftResolution = resolutionOf(left);
    const rightResolution = resolutionOf(right);
    if (!leftResolution && !rightResolution) return 0;
    if (!leftResolution) return 1;
    if (!rightResolution) return -1;

    const leftRatioDistance = Math.abs(
        leftResolution.width / leftResolution.height - HERO_ASPECT_RATIO
    );
    const rightRatioDistance = Math.abs(
        rightResolution.width / rightResolution.height - HERO_ASPECT_RATIO
    );
    if (leftRatioDistance !== rightRatioDistance) {
        return leftRatioDistance - rightRatioDistance;
    }

    const leftIsLargeEnough = leftResolution.width >= HERO_MINIMUM_WIDTH;
    const rightIsLargeEnough = rightResolution.width >= HERO_MINIMUM_WIDTH;
    if (leftIsLargeEnough !== rightIsLargeEnough) return leftIsLargeEnough ? -1 : 1;

    return leftIsLargeEnough
        ? leftResolution.width - rightResolution.width
        : rightResolution.width - leftResolution.width;
}

export function resolveSitePath(path) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..')) {
        throw new Error(`Unsafe demo catalogue path: ${path}`);
    }

    return new URL(path, SITE_ROOT_URL);
}

export async function loadDemoCatalog() {
    const response = await fetch(DEMO_CATALOG_URL);
    if (!response.ok) {
        throw new Error(
            `Unable to load ${DEMO_CATALOG_URL.pathname}: ${response.status}`
        );
    }

    return response.json();
}

export function findDemoExample(catalogue, id) {
    const example = catalogue.examples.find(candidate => candidate.id === id);
    if (!example) throw new Error(`Unknown OGraf example: ${id}`);

    return example;
}

export function isHeroThumbnailPath(path) {
    if (typeof path !== 'string' || !path) return false;
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return false; }
    return !/[\\\x00-\x1f?#]/.test(decoded)
        && !/^[a-z][a-z\d+.-]*:/i.test(decoded)
        && !decoded.split('/').some(part => !part || part === '.' || part === '..')
        && /\.(?:png|jpe?g|webp)$/i.test(decoded);
}

export function selectHeroThumbnail(thumbnails, preferredFile) {
    const entries = Array.isArray(thumbnails) ? thumbnails : [];
    if (preferredFile !== undefined) {
        if (!isHeroThumbnailPath(preferredFile)) {
            throw new Error('presentation.heroThumbnail must be a safe relative PNG, JPEG or WebP path; GIF is not supported');
        }
        const selected = entries.find(thumbnail => thumbnail?.file === preferredFile);
        if (!selected) {
            throw new Error(`presentation.heroThumbnail is not declared in the example manifest: ${preferredFile}`);
        }
        return selected;
    }
    // Filter before ranking: GIF must never win, even with ideal dimensions.
    const candidates = entries.filter(thumbnail => isHeroThumbnailPath(thumbnail?.file));
    return candidates.sort(compareThumbnails)[0] ?? null;
}
