import { access, readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { HtmlValidate } from 'html-validate';
import { selectHeroThumbnail } from '../../js/demo-catalog.js';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const TOOLING_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const REPOSITORY_ROOT = resolve(TOOLING_ROOT, '..', '..');
const WEBSITE_ROOT = resolve(REPOSITORY_ROOT, 'website');
const HTML_FILES = [
    resolve(REPOSITORY_ROOT, 'index.html'),
    resolve(WEBSITE_ROOT, 'demo-player/index.html')
];
const ROBOTS_POLICIES = new Map([
    [resolve(REPOSITORY_ROOT, 'index.html'), 'index,follow'],
    [resolve(WEBSITE_ROOT, 'demo-player/index.html'), 'noindex,nofollow']
]);
const FORBIDDEN_RUNTIME_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'youtube.com/embed'
];
const RUNTIME_ASSET_BUDGETS = new Map([
    ['website/assets/img/bg-interview.webp', 100_000],
    ['website/assets/img/bg-newsroom.jpg', 250_000],
    ['website/assets/img/bg-stadium.webp', 350_000],
    ['website/assets/img/ograf-social-preview.png', 280_000],
    ['website/assets/vendor/lucide/lucide.min.js', 10_000]
]);
const HERO_THUMBNAIL_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const HERO_THUMBNAIL_MAXIMUM_BYTES = 500_000;
const GRAPHIC_MANIFEST_SCHEMA_ID =
    'https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json';
const errors = [];

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function walk(directory, predicate) {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = [];

    for (const entry of entries) {
        if (entry.name === 'node_modules') continue;
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            paths.push(...await walk(entryPath, predicate));
        } else if (predicate(entryPath)) {
            paths.push(entryPath);
        }
    }

    return paths.sort();
}

function report(message) {
    errors.push(message);
}

function isSafeRelativeAssetPath(path) {
    return typeof path === 'string'
        && path.length > 0
        && !path.startsWith('/')
        && !path.startsWith('//')
        && !path.includes('\\')
        && !path.split('/').includes('..')
        && !/^[a-z][a-z0-9+.-]*:/i.test(path);
}

function isIgnoredReference(reference) {
    return !reference
        || reference.startsWith('#')
        || reference.startsWith('%23')
        || reference.startsWith('/')
        || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference);
}

async function validateLocalReferences(filePath, contents, pattern) {
    for (const match of contents.matchAll(pattern)) {
        const reference = match[1].split(/[?#]/, 1)[0];
        if (isIgnoredReference(reference)) continue;
        const resolvedReference = resolve(dirname(filePath), decodeURIComponent(reference));
        if (!await exists(resolvedReference)) {
            report(`${relative(REPOSITORY_ROOT, filePath)} references missing ${reference}`);
        }
    }
}

async function validateHtml() {
    const validator = new HtmlValidate({
        extends: ['html-validate:recommended'],
        rules: {
            'prefer-native-element': 'off'
        }
    });

    for (const filePath of HTML_FILES) {
        const contents = await readFile(filePath, 'utf8');
        const reportResult = await validator.validateString(contents, filePath);

        for (const result of reportResult.results) {
            for (const message of result.messages) {
                report(`${relative(REPOSITORY_ROOT, filePath)}:${message.line}:${message.column} ${message.ruleId}: ${message.message}`);
            }
        }

        const expectedRobotsPolicy = ROBOTS_POLICIES.get(filePath);
        const robotsPolicyPattern = new RegExp(
            `<meta\\s+name=["']robots["']\\s+content=["']${expectedRobotsPolicy}["']`,
            'i'
        );
        if (!robotsPolicyPattern.test(contents)) {
            report(
                `${relative(REPOSITORY_ROOT, filePath)} is missing ${expectedRobotsPolicy}`
            );
        }

        await validateLocalReferences(
            filePath,
            contents,
            /(?:href|src|data-manifest|data-base)=["']([^"']+)["']/gi
        );
    }
}

async function validateCss() {
    const cssFiles = await walk(resolve(WEBSITE_ROOT, 'css'), path => extname(path) === '.css');
    for (const filePath of cssFiles) {
        const contents = await readFile(filePath, 'utf8');
        await validateLocalReferences(filePath, contents, /url\(\s*["']?([^"')]+)["']?\s*\)/gi);
    }
}

async function validateJson() {
    const jsonFiles = await walk(WEBSITE_ROOT, path => extname(path) === '.json');
    for (const filePath of jsonFiles) {
        try {
            JSON.parse(await readFile(filePath, 'utf8'));
        } catch (error) {
            report(`${relative(REPOSITORY_ROOT, filePath)} contains invalid JSON: ${error.message}`);
        }
    }
}

async function validateExampleManifests() {
    const schemaRoot = resolve(
        REPOSITORY_ROOT,
        'v1/specification/json-schemas'
    );
    const schemaFiles = await walk(schemaRoot, path => extname(path) === '.json');
    const validator = new Ajv2020({ allErrors: true, strict: false });

    for (const schemaPath of schemaFiles) {
        const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
        if (schema.$id && !validator.getSchema(schema.$id)) validator.addSchema(schema);
    }

    const validateManifest = validator.getSchema(GRAPHIC_MANIFEST_SCHEMA_ID);
    if (!validateManifest) {
        report('Unable to compile the OGraf Graphic manifest schema');
        return;
    }

    const catalogue = JSON.parse(
        await readFile(resolve(WEBSITE_ROOT, 'demo-catalog.json'), 'utf8')
    );
    for (const example of catalogue.examples ?? []) {
        const manifestPath = resolve(REPOSITORY_ROOT, example.manifest);
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (validateManifest(manifest)) continue;

        const validationErrors = (validateManifest.errors ?? [])
            .map(error => `${error.instancePath || '/'} ${error.message}`)
            .join('; ');
        report(`${example.id} manifest is invalid: ${validationErrors}`);
    }
}

async function validateJavaScript() {
    const scriptFiles = await walk(WEBSITE_ROOT, path => {
        if (!['.js', '.mjs'].includes(extname(path))) return false;
        return !path.includes('/assets/vendor/');
    });

    for (const filePath of scriptFiles) {
        const check = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
        if (check.status !== 0) {
            report(`${relative(REPOSITORY_ROOT, filePath)} failed node --check:\n${check.stderr.trim()}`);
        }
    }
}

async function validateRuntimeDependencies() {
    const runtimeFiles = [
        resolve(REPOSITORY_ROOT, 'index.html'),
        ...await walk(resolve(WEBSITE_ROOT, 'css'), path => extname(path) === '.css'),
        ...await walk(resolve(WEBSITE_ROOT, 'js'), path => ['.js', '.mjs'].includes(extname(path)))
    ];

    for (const filePath of runtimeFiles) {
        const contents = await readFile(filePath, 'utf8');
        for (const host of FORBIDDEN_RUNTIME_HOSTS) {
            if (contents.includes(host)) {
                report(`${relative(REPOSITORY_ROOT, filePath)} contains forbidden runtime host ${host}`);
            }
        }
    }
}

async function validateHeroThumbnails() {
    const catalogue = JSON.parse(
        await readFile(resolve(WEBSITE_ROOT, 'demo-catalog.json'), 'utf8')
    );

    for (const example of catalogue.examples ?? []) {
        try {
            const manifestPath = resolve(REPOSITORY_ROOT, example.manifest);
            const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
            const thumbnail = selectHeroThumbnail(manifest.thumbnails);
            if (!thumbnail) {
                report(`${example.id} does not define a hero thumbnail`);
                continue;
            }
            if (!isSafeRelativeAssetPath(thumbnail.file)) {
                report(`${example.id} hero thumbnail path is unsafe: ${thumbnail.file}`);
                continue;
            }
            if (!HERO_THUMBNAIL_EXTENSIONS.has(extname(thumbnail.file).toLowerCase())) {
                report(`${example.id} hero thumbnail uses an unsupported image format`);
                continue;
            }

            const thumbnailPath = resolve(dirname(manifestPath), thumbnail.file);
            if (!await exists(thumbnailPath)) {
                report(`${example.id} hero thumbnail is missing: ${thumbnail.file}`);
                continue;
            }

            const thumbnailStats = await stat(thumbnailPath);
            if (thumbnailStats.size > HERO_THUMBNAIL_MAXIMUM_BYTES) {
                report(`${example.id} hero thumbnail exceeds the 500 KB performance budget`);
            }

            const repositoryPath = relative(REPOSITORY_ROOT, thumbnailPath).split('\\').join('/');
            if (!example.files?.some(file => file.source === repositoryPath)) {
                report(`${example.id} hero thumbnail is missing from the generated catalogue`);
            }
        } catch (error) {
            report(`${example.id ?? 'Unknown example'} thumbnail validation failed: ${error.message}`);
        }
    }
}

async function validateRepositoryContract() {
    const cname = (await readFile(resolve(REPOSITORY_ROOT, 'CNAME'), 'utf8')).trim();
    if (cname !== 'ograf.ebu.io') report(`CNAME must remain ograf.ebu.io, got ${cname}`);

    const requiredPaths = [
        'index.html',
        'robots.txt',
        'sitemap.xml',
        'site.webmanifest',
        'website/assets/icons/favicon.svg',
        'website/assets/icons/favicon-96x96.png',
        'website/assets/icons/apple-touch-icon.png',
        'docs/logo/ograf-logo-colour.svg',
        'v1/specification/docs/Specification.md',
        'v1/specification/docs/Specification_Server_API.md',
        'v1/specification/json-schemas/graphics/schema.json',
        'v1/specification/open-api/docs/index.html',
        'CHANGELOG.md',
        'website/assets/vendor/gsap/gsap.min.js',
        'website/assets/vendor/gsap/ScrollTrigger.min.js',
        'website/assets/vendor/lucide/lucide.min.js',
        'website/assets/img/bg-interview.webp',
        'website/assets/img/bg-newsroom.jpg',
        'website/assets/img/bg-stadium.webp',
        'website/assets/img/ograf-social-preview.png',
        'website/demo-catalog.json',
        'website/demo-player/index.html',
        'v1/examples/scoreboard/scoreboard.ograf.json',
        'v1/examples/responsive-lower-third/responsive-lower-third.ograf.json',
        'v1/examples/l3rd-name/l3rd.ograf.json',
        'v1/examples/bar-chart/bar-chart.ograf.json',
        'v1/examples/headline/headline.ograf.json',
        'v1/examples/weather/weather.ograf.json'
    ];

    for (const requiredPath of requiredPaths) {
        if (!await exists(resolve(REPOSITORY_ROOT, requiredPath))) {
            report(`Required path is missing: ${requiredPath}`);
        }
    }

    const robotsContents = await readFile(resolve(REPOSITORY_ROOT, 'robots.txt'), 'utf8');
    if (!robotsContents.includes('User-agent: *') || !robotsContents.includes('Allow: /')) {
        report('robots.txt must allow public crawling');
    }
    if (!robotsContents.includes('Sitemap: https://ograf.ebu.io/sitemap.xml')) {
        report('robots.txt must reference the production sitemap');
    }

    const sitemapContents = await readFile(resolve(REPOSITORY_ROOT, 'sitemap.xml'), 'utf8');
    if (sitemapContents.includes('/website/demo-player/')) {
        report('sitemap.xml must not include the non-indexable demo player');
    }
    for (const publicUrl of [
        'https://ograf.ebu.io/',
        'https://ograf.ebu.io/v1/specification/docs/Specification.html',
        'https://ograf.ebu.io/v1/specification/docs/Specification_Server_API.html',
        'https://ograf.ebu.io/v1/specification/open-api/docs/',
        'https://ograf.ebu.io/CHANGELOG.html'
    ]) {
        if (!sitemapContents.includes(`<loc>${publicUrl}</loc>`)) {
            report(`sitemap.xml is missing ${publicUrl}`);
        }
    }

    for (const [assetPath, maximumBytes] of RUNTIME_ASSET_BUDGETS) {
        const assetStats = await stat(resolve(REPOSITORY_ROOT, assetPath));
        if (assetStats.size > maximumBytes) {
            report(`${assetPath} exceeds its ${maximumBytes}-byte performance budget`);
        }
    }

    for (const legacyImage of [
        'website/assets/img/bg-interview.jpg',
        'website/assets/img/bg-stadium.jpg'
    ]) {
        if (await exists(resolve(REPOSITORY_ROOT, legacyImage))) {
            report(`Optimized image duplicates legacy asset ${legacyImage}`);
        }
    }

    const manifestCheck = spawnSync(
        process.execPath,
        [resolve(SCRIPT_DIRECTORY, 'update-manifests.mjs'), '--check'],
        { encoding: 'utf8' }
    );
    if (manifestCheck.status !== 0) {
        report(manifestCheck.stderr.trim() || manifestCheck.stdout.trim());
    }

    const demoCatalogCheck = spawnSync(
        process.execPath,
        [resolve(SCRIPT_DIRECTORY, 'update-demo-catalog.mjs'), '--check'],
        { encoding: 'utf8' }
    );
    if (demoCatalogCheck.status !== 0) {
        report(demoCatalogCheck.stderr.trim() || demoCatalogCheck.stdout.trim());
    }
}

await Promise.all([
    validateHtml(),
    validateCss(),
    validateJson(),
    validateExampleManifests(),
    validateJavaScript(),
    validateRuntimeDependencies(),
    validateHeroThumbnails(),
    validateRepositoryContract()
]);

if (errors.length) {
    console.error(errors.map(error => `- ${error}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log('Website validation passed.');
}
