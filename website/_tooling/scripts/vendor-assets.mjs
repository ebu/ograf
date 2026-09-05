import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLucideBundle } from './create-lucide-bundle.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const TOOLING_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const REPOSITORY_ROOT = resolve(TOOLING_ROOT, '..', '..');
const NODE_MODULES = resolve(TOOLING_ROOT, 'node_modules');
const ASSET_ROOT = resolve(REPOSITORY_ROOT, 'website/assets');

const COPIES = [
    ['gsap/dist/gsap.min.js', 'vendor/gsap/gsap.min.js'],
    ['gsap/dist/ScrollTrigger.min.js', 'vendor/gsap/ScrollTrigger.min.js'],
    ['lucide/LICENSE', 'vendor/licenses/lucide-ISC.txt'],
    ['@fontsource/plus-jakarta-sans/LICENSE',
        'vendor/licenses/plus-jakarta-sans-OFL-1.1.txt'],
    ['@fontsource/space-mono/LICENSE', 'vendor/licenses/space-mono-OFL-1.1.txt'],
    ['@fontsource/caveat/LICENSE', 'vendor/licenses/caveat-OFL-1.1.txt'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-300-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-300-normal.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-italic.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-italic.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-normal.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-700-normal.woff2'],
    ['@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2',
        'fonts/plus-jakarta-sans/plus-jakarta-sans-latin-800-normal.woff2'],
    ['@fontsource/space-mono/files/space-mono-latin-400-normal.woff2',
        'fonts/space-mono/space-mono-latin-400-normal.woff2'],
    ['@fontsource/space-mono/files/space-mono-latin-700-normal.woff2',
        'fonts/space-mono/space-mono-latin-700-normal.woff2'],
    ['@fontsource/caveat/files/caveat-latin-500-normal.woff2',
        'fonts/caveat/caveat-latin-500-normal.woff2'],
    ['@fontsource/caveat/files/caveat-latin-700-normal.woff2',
        'fonts/caveat/caveat-latin-700-normal.woff2']
];

const NORMALIZED_TEXT_DESTINATIONS = new Set([
    'vendor/gsap/gsap.min.js',
    'vendor/gsap/ScrollTrigger.min.js'
]);

for (const [sourcePath, destinationPath] of COPIES) {
    const resolvedSource = resolve(NODE_MODULES, sourcePath);
    const resolvedDestination = resolve(ASSET_ROOT, destinationPath);
    await mkdir(dirname(resolvedDestination), { recursive: true });

    if (NORMALIZED_TEXT_DESTINATIONS.has(destinationPath)) {
        const source = await readFile(resolvedSource, 'utf8');
        const normalizedSource = `${source.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
        await writeFile(resolvedDestination, normalizedSource, 'utf8');
    } else {
        await copyFile(resolvedSource, resolvedDestination);
    }
}

const lucideBundlePath = resolve(ASSET_ROOT, 'vendor/lucide/lucide.min.js');
await mkdir(dirname(lucideBundlePath), { recursive: true });
await createLucideBundle(lucideBundlePath);

console.log(`Vendored ${COPIES.length + 1} runtime assets.`);
