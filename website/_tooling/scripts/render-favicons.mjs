import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..', '..', '..');
const ICONS_ROOT = resolve(REPOSITORY_ROOT, 'website/assets/icons');
const SOURCE_PATH = resolve(ICONS_ROOT, 'favicon.svg');
const OUTPUTS = [
    { file: 'favicon-96x96.png', size: 96, background: 'transparent' },
    { file: 'apple-touch-icon.png', size: 180, background: '#87A0DE' }
];

const source = await readFile(SOURCE_PATH, 'utf8');
const sourceUrl = `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
const browser = await chromium.launch();

try {
    for (const output of OUTPUTS) {
        const page = await browser.newPage({
            viewport: { width: output.size, height: output.size },
            deviceScaleFactor: 1
        });
        await page.setContent(`
            <style>
                html, body {
                    margin: 0;
                    width: ${output.size}px;
                    height: ${output.size}px;
                    background: ${output.background};
                }
                img {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
            </style>
            <img src="${sourceUrl}" alt="">
        `);
        await page.locator('img').screenshot({
            path: resolve(ICONS_ROOT, output.file),
            omitBackground: output.background === 'transparent'
        });
        await page.close();
    }
} finally {
    await browser.close();
}

console.log('Favicons rendered from favicon.svg.');
