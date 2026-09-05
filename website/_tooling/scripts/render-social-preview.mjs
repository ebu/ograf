import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const TOOLING_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const WEBSITE_ROOT = resolve(TOOLING_ROOT, '..');
const REPOSITORY_ROOT = resolve(WEBSITE_ROOT, '..');
const SOCIAL_PREVIEW_PATH = resolve(
    WEBSITE_ROOT,
    'assets/img/ograf-social-preview.png'
);
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

async function readDataUrl(filePath, mimeType) {
    const contents = await readFile(filePath);

    return `data:${mimeType};base64,${contents.toString('base64')}`;
}

function buildSocialPreviewHtml({ logoUrl, sansFontUrl, monoFontUrl }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @font-face {
            font-family: 'Plus Jakarta Sans';
            font-style: normal;
            font-weight: 400;
            src: url('${sansFontUrl}') format('woff2');
        }

        @font-face {
            font-family: 'Space Mono';
            font-style: normal;
            font-weight: 700;
            src: url('${monoFontUrl}') format('woff2');
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            width: ${CARD_WIDTH}px;
            height: ${CARD_HEIGHT}px;
            margin: 0;
            overflow: hidden;
        }

        .social-preview {
            position: relative;
            isolation: isolate;
            width: ${CARD_WIDTH}px;
            height: ${CARD_HEIGHT}px;
            overflow: hidden;
            color: #f9fafb;
            background:
                radial-gradient(
                    ellipse 90% 95% at 55% -20%,
                    rgb(35 82 195 / 38%) 0%,
                    rgb(35 82 195 / 14%) 42%,
                    transparent 72%
                ),
                #0d1117;
        }

        .social-preview::after {
            position: absolute;
            z-index: 3;
            inset: 0;
            background:
                radial-gradient(circle, rgb(255 255 255 / 35%) 0 0.5px, transparent 0.8px)
                    0 0 / 7px 7px,
                radial-gradient(circle, rgb(135 160 222 / 24%) 0 0.5px, transparent 0.9px)
                    3px 2px / 11px 11px;
            content: '';
            opacity: 0.08;
            pointer-events: none;
        }

        .broadcast-frames {
            position: absolute;
            z-index: 0;
            top: 56px;
            right: -185px;
            width: 650px;
            height: 510px;
            transform: rotate(-6deg);
            opacity: 0.42;
        }

        .broadcast-frame {
            position: absolute;
            width: 390px;
            height: 218px;
            border: 1px solid rgb(135 160 222 / 22%);
            border-radius: 18px;
            background:
                linear-gradient(135deg, rgb(35 82 195 / 14%), transparent 68%),
                rgb(255 255 255 / 2%);
            box-shadow:
                0 24px 60px rgb(0 0 0 / 34%),
                0 0 40px rgb(35 82 195 / 9%);
        }

        .broadcast-frame:first-child {
            top: 0;
            right: 40px;
        }

        .broadcast-frame:nth-child(2) {
            right: 180px;
            bottom: 0;
        }

        .broadcast-frame::before,
        .broadcast-frame::after {
            position: absolute;
            left: 28px;
            content: '';
            border-radius: 999px;
        }

        .broadcast-frame::before {
            bottom: 46px;
            width: 205px;
            height: 20px;
            background: rgb(135 160 222 / 17%);
        }

        .broadcast-frame::after {
            bottom: 22px;
            width: 132px;
            height: 10px;
            background: rgb(255 255 255 / 10%);
        }

        .content {
            position: relative;
            z-index: 2;
            width: 1010px;
            padding: 96px 0 0 92px;
        }

        .eyebrow {
            margin: 0 0 34px;
            color: #87a0de;
            font-family: 'Space Mono', monospace;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.16em;
            line-height: 1.4;
            text-transform: uppercase;
        }

        .logo {
            display: block;
            width: 585px;
            height: auto;
            margin: 0 0 40px;
            filter:
                drop-shadow(0 6px 24px rgb(13 17 23 / 65%))
                drop-shadow(0 2px 8px rgb(13 17 23 / 85%));
        }

        .subtitle {
            max-width: 940px;
            margin: 0;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 42px;
            font-weight: 400;
            letter-spacing: 0.01em;
            line-height: 1.25;
            text-shadow:
                0 2px 14px rgb(13 17 23 / 85%),
                0 0 8px rgb(13 17 23 / 65%);
        }
    </style>
</head>
<body>
    <article class="social-preview">
        <div class="broadcast-frames" aria-hidden="true">
            <div class="broadcast-frame"></div>
            <div class="broadcast-frame"></div>
        </div>
        <div class="content">
            <p class="eyebrow">European Broadcasting Union</p>
            <img class="logo" src="${logoUrl}" alt="OGraf">
            <p class="subtitle">
                The EBU's open specification to liberate<br>
                broadcast graphics
            </p>
        </div>
    </article>
</body>
</html>`;
}

async function renderSocialPreview() {
    const [logoUrl, sansFontUrl, monoFontUrl] = await Promise.all([
        readDataUrl(resolve(REPOSITORY_ROOT, 'docs/logo/ograf-logo-colour.svg'), 'image/svg+xml'),
        readDataUrl(
            resolve(
                WEBSITE_ROOT,
                'assets/fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2'
            ),
            'font/woff2'
        ),
        readDataUrl(
            resolve(WEBSITE_ROOT, 'assets/fonts/space-mono/space-mono-latin-700-normal.woff2'),
            'font/woff2'
        )
    ]);
    const browser = await chromium.launch({ headless: true });

    try {
        const context = await browser.newContext({
            viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
            deviceScaleFactor: 1
        });
        const page = await context.newPage();
        const html = buildSocialPreviewHtml({ logoUrl, sansFontUrl, monoFontUrl });

        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(async () => {
            await document.fonts.ready;
            const logo = document.querySelector('.logo');
            if (!logo.complete) {
                await new Promise((resolveImage, rejectImage) => {
                    logo.addEventListener('load', resolveImage, { once: true });
                    logo.addEventListener('error', rejectImage, { once: true });
                });
            }
        });

        await mkdir(dirname(SOCIAL_PREVIEW_PATH), { recursive: true });
        await page.locator('.social-preview').screenshot({
            path: SOCIAL_PREVIEW_PATH,
            type: 'png'
        });
        await context.close();
    } finally {
        await browser.close();
    }

    console.log(`Rendered ${SOCIAL_PREVIEW_PATH} (${CARD_WIDTH}x${CARD_HEIGHT})`);
}

await renderSocialPreview();
