import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, extname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { selectHeroThumbnail } from '../../js/demo-catalog.js';
import { attribute, inspectHtml, validateCardReferences } from './inspect-html.mjs';
import { updateDemoCatalog } from './update-demo-catalog.mjs';
import { updateManifests } from './update-manifests.mjs';
import {
    cliRoot, isMain, isSafePath, localFile, readJson, repositoryPath, walkFiles
} from './content-utils.mjs';

const PRODUCTION = 'https://ograf.ebu.io/';
const DOCUMENT_ROUTES = [
    'v1/specification/docs/Specification.html',
    'v1/specification/docs/Specification_Server_API.html',
    'v1/specification/json-schemas/graphics/schema.json',
    'v1/specification/open-api/docs/', 'CHANGELOG.html'
];
const BUDGETS = new Map([
    ['website/assets/img/bg-interview.webp', 100_000],
    ['website/assets/img/bg-newsroom.jpg', 250_000],
    ['website/assets/img/bg-stadium.webp', 350_000],
    ['website/assets/img/ograf-social-preview.png', 280_000],
    ['website/assets/vendor/lucide/lucide.min.js', 10_000]
]);
const IMAGE_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const FORBIDDEN_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdn.jsdelivr.net']);

export async function validateSite(root = cliRoot()) {
    const errors = [];
    const warnings = [];
    const references = new Set();
    const report = message => errors.push(message);
    async function attempt(label, task) {
        try { await task(); }
        catch (error) { report(`${label}: ${error.message}`); }
    }
    async function reference(owner, value, { resource = false, directory = false } = {}) {
        if (!value || /^(?:data:|mailto:|tel:|javascript:)/i.test(value)) return;
        if (decodeURIComponent(value).startsWith('#')) return;
        const ownerUrl = new URL(repositoryPath(root, owner), PRODUCTION);
        const url = new URL(value, ownerUrl);
        if (url.origin !== new URL(PRODUCTION).origin) {
            if (resource && (FORBIDDEN_HOSTS.has(url.hostname) || url.hostname === 'www.youtube.com')) {
                report(`${repositoryPath(root, owner)}: remote runtime dependency ${url.hostname}`);
            }
            return;
        }
        const path = decodeURIComponent(url.pathname).slice(1);
        if (!path) return;
        if (directory) {
            if (!isSafePath(path.replace(/\/$/, '')) || !(await stat(resolve(root, path))).isDirectory()) {
                report(`${repositoryPath(root, owner)} references missing directory ${value}`);
            }
            return;
        }
        const candidates = path.endsWith('/') ? [`${path}index.html`] : [path];
        if (path.endsWith('.html')) candidates.push(`${path.slice(0, -5)}.md`);
        let found;
        for (const candidate of candidates) {
            try { found = await localFile(root, candidate); break; } catch { /* try Jekyll source */ }
        }
        if (!found) { report(`${repositoryPath(root, owner)} references missing ${value}`); return; }
        references.add(repositoryPath(root, found));
    }
    let landing;
    for (const path of ['index.html', 'website/demo-player/index.html']) {
        await attempt(path, async () => {
            const file = resolve(root, path);
            const contents = await readFile(file, 'utf8');
            const inspected = await inspectHtml(contents, path);
            errors.push(...inspected.errors);
            const document = inspected.root;
            if (!document) throw new Error('Unable to parse HTML');
            if (path === 'index.html') landing = document;
            const ids = new Set(document.querySelectorAll('[id]').map(node => attribute(node, 'id')));
            for (const link of document.querySelectorAll('a[href]')) {
                const href = attribute(link, 'href');
                if (href?.startsWith('#') && href.length > 1 && !ids.has(decodeURIComponent(href.slice(1)))) {
                    report(`${path}: missing navigation target ${href}`);
                }
            }
            const policy = new Set(attribute(document.querySelector('meta[name="robots"]'), 'content')
                ?.toLowerCase().split(',').map(x => x.trim()));
            if (policy.has('all')) { policy.add('index'); policy.add('follow'); }
            if (policy.has('none')) { policy.add('noindex'); policy.add('nofollow'); }
            const expected = path === 'index.html' ? ['follow', 'index'] : ['nofollow', 'noindex'];
            const forbidden = path === 'index.html' ? ['nofollow', 'noindex'] : ['follow', 'index'];
            if (!expected.every(value => policy.has(value)) || forbidden.some(value => policy.has(value))) {
                report(`${path}: robots must specify ${expected.join(',')} without contradictory directives`);
            }
            for (const node of document.querySelectorAll('[href], [src], [data-src], [data-manifest], [data-base]')) {
                for (const name of ['href', 'src', 'data-src', 'data-manifest', 'data-base']) {
                    const value = attribute(node, name);
                    if (value && !value.startsWith('#')) await reference(file, value, {
                        resource: name !== 'href', directory: name === 'data-base'
                    });
                }
            }
            for (const node of document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')) {
                await reference(file, attribute(node, 'content'), { resource: true });
            }
            // The stage's inline module imports are real website dependencies too.
            for (const script of document.querySelectorAll('script')) {
                for (const match of script.textContent.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
                    await reference(file, match[1], { resource: true });
                }
            }
        });
    }
    for (const directory of ['website/js', 'website/css']) {
        await attempt(directory, async () => {
            for (const file of await walkFiles(resolve(root, directory))) {
                const contents = await readFile(file, 'utf8');
                if (['.js', '.mjs'].includes(extname(file))) {
                    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
                    if (check.error) throw check.error;
                    if (check.status !== 0) report(`${repositoryPath(root, file)}: ${check.stderr.trim()}`);
                    for (const match of contents.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
                        await reference(file, match[1], { resource: true });
                    }
                } else if (extname(file) === '.css') {
                    for (const match of contents.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
                        await reference(file, match[1], { resource: true });
                    }
                }
            }
        });
    }
    await attempt('website/demo-catalog.json', async () => {
        const catalogue = await readJson(resolve(root, 'website/demo-catalog.json'));
        // Validates IDs, file membership, paths and hashes without writing anything.
        await updateDemoCatalog(root, true);
        if (landing) errors.push(...validateCardReferences(landing, catalogue));
        const schemas = new Ajv2020({ allErrors: true, strict: false });
        for (const path of await walkFiles(resolve(root, 'v1/specification/json-schemas'))) {
            if (extname(path) !== '.json') continue;
            const schema = await readJson(path);
            if (schema.$id && !schemas.getSchema(schema.$id)) schemas.addSchema(schema);
        }
        const validate = schemas.getSchema(`${PRODUCTION}v1/specification/json-schemas/graphics/schema.json`);
        if (!validate) throw new Error('Unable to compile Graphic manifest schema');
        for (const example of catalogue.examples) {
            await attempt(`website/demo-catalog.json [${example.id}]`, async () => {
                const file = await localFile(root, example.manifest);
                const manifest = await readJson(file);
                if (!validate(manifest)) report(`${example.manifest}: ${schemas.errorsText(validate.errors)}`);
                const presentation = example.presentation;
                if (!['viewport', 'fixed-canvas'].includes(presentation?.renderer)) throw new Error('Unsupported renderer');
                if ((presentation.renderer === 'fixed-canvas' || presentation.canvas)
                    && !['width', 'height'].every(key => Number.isFinite(presentation.canvas?.[key]) && presentation.canvas[key] > 0)) {
                    throw new Error('fixed-canvas requires positive canvas width and height');
                }
                const background = presentation.background;
                if (background && !['image', 'video'].includes(background.type)) throw new Error('Unsupported background type');
                if (background?.type === 'video' && !background.sources?.length) throw new Error('Video background requires sources');
                for (const source of background?.type === 'image' ? [background.src]
                    : background?.type === 'video' ? (background.sources ?? []).map(x => x.src) : []) {
                    await localFile(root, source);
                    references.add(source);
                }
                const thumbnail = selectHeroThumbnail(manifest.thumbnails, presentation.heroThumbnail);
                if (!thumbnail || !isSafePath(thumbnail.file) || !IMAGE_EXTENSIONS.has(extname(thumbnail.file).toLowerCase())) {
                    throw new Error('Missing supported hero thumbnail (PNG, JPEG or WebP; GIF is not supported)');
                }
                const thumbnailFile = await localFile(dirname(file), thumbnail.file);
                if (!example.files.some(entry => entry.source === repositoryPath(root, thumbnailFile))) {
                    throw new Error(`Thumbnail is missing from package: ${thumbnail.file}`);
                }
                if ((await stat(thumbnailFile)).size > 500_000) {
                    warnings.push(`${example.id}: selected hero thumbnail exceeds the 500 KB performance budget`);
                }
            });
        }
    });
    await attempt('Logo manifests', () => updateManifests(root, true));
    await attempt('Website publication', async () => {
        if ((await readFile(resolve(root, 'CNAME'), 'utf8')).trim() !== 'ograf.ebu.io') throw new Error('CNAME must remain ograf.ebu.io');
        const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
        if (!/^User-agent:\s*\*\s*$/im.test(robots) || !/^Allow:\s*\/\s*$/im.test(robots)
            || !robots.includes(`Sitemap: ${PRODUCTION}sitemap.xml`)) throw new Error('robots.txt must allow crawling and reference the production sitemap');
        const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
        const urls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(x => x[1].trim());
        for (const path of ['', ...DOCUMENT_ROUTES]) {
            if (!path.endsWith('.json') && !urls.includes(`${PRODUCTION}${path}`)) report(`sitemap.xml: missing ${PRODUCTION}${path}`);
            if (path) await reference(resolve(root, 'index.html'), path);
        }
        if (urls.some(url => url.includes('/website/demo-player/'))) report('sitemap.xml must not include the non-indexable demo player');
        const appManifest = await readJson(resolve(root, 'site.webmanifest'));
        for (const icon of appManifest.icons ?? []) await reference(resolve(root, 'site.webmanifest'), icon.src);
    });
    for (const [path, budget] of BUDGETS) {
        if (!references.has(path)) continue;
        await attempt(path, async () => {
            if ((await stat(resolve(root, path))).size > budget) warnings.push(`${path}: exceeds ${budget}-byte performance budget`);
        });
    }
    return { errors, warnings };
}

if (isMain(import.meta.url)) {
    try {
        const { errors, warnings } = await validateSite();
        for (const warning of warnings) console.warn(`Warning: ${warning}`);
        for (const error of errors) console.error(`- ${error}`);
        if (errors.length) process.exitCode = 1;
        else console.log('Website validation passed.');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
