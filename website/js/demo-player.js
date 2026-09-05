import {
    findDemoExample,
    loadDemoCatalog,
    resolveSitePath
} from './demo-catalog.js';

const MESSAGE_ORIGIN = window.location.origin;
const GRAPHIC_TAG = 'ograf-demo-graphic';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.getElementById('graphic-canvas');

let example;
let graphic;
let manifest;
let backgroundVideo;
let isResetting = false;

function notifyParent(message) {
    window.parent.postMessage(message, MESSAGE_ORIGIN);
}

async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url.pathname}: ${response.status}`);

    return response.json();
}

function getDefaultData(schema) {
    return Object.fromEntries(Object.entries(schema?.properties ?? {}).flatMap(([key, value]) => (
        Object.hasOwn(value, 'default') ? [[key, value.default]] : []
    )));
}

function syncBackgroundVideo() {
    if (!backgroundVideo) return;

    if (motionQuery.matches) {
        backgroundVideo.pause();
        try {
            backgroundVideo.currentTime = 0;
        } catch (_) {
            // Metadata may not be available yet.
        }
        return;
    }

    backgroundVideo.play().catch(() => {
        // Muted autoplay can still be blocked by an embedding policy.
    });
}

function setupBackground(background = {}) {
    document.body.style.setProperty('--demo-overlay', background.overlay ?? 'transparent');

    if (background.type === 'image') {
        const imageUrl = resolveSitePath(background.src);
        document.body.style.backgroundImage = `url('${imageUrl.href}')`;
        return;
    }

    if (background.type !== 'video') return;

    backgroundVideo = document.createElement('video');
    backgroundVideo.className = 'demo-background bg-video';
    backgroundVideo.muted = true;
    backgroundVideo.loop = true;
    backgroundVideo.playsInline = true;
    backgroundVideo.preload = 'metadata';

    for (const sourceDefinition of background.sources ?? []) {
        const source = document.createElement('source');
        source.src = resolveSitePath(sourceDefinition.src).href;
        source.type = sourceDefinition.type;
        backgroundVideo.append(source);
    }

    document.body.prepend(backgroundVideo);
    syncBackgroundVideo();
    motionQuery.addEventListener('change', syncBackgroundVideo);
}

function fitCanvas() {
    if (example.presentation.renderer !== 'fixed-canvas') return;

    const canvasSize = example.presentation.canvas;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const scale = Math.max(
        viewportWidth / canvasSize.width,
        viewportHeight / canvasSize.height
    );
    if (!(scale > 0) || !Number.isFinite(scale)) return;

    const left = Math.round((viewportWidth - canvasSize.width * scale) / 2);
    const top = Math.round(viewportHeight / 2 - canvasSize.height * scale / 2);
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    canvas.style.transform = `scale(${scale})`;

}

function setupCanvas() {
    if (example.presentation.renderer !== 'fixed-canvas') return;

    const { width, height } = example.presentation.canvas;
    canvas.classList.add('graphic-canvas--fixed');
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

function renderCharacteristics() {
    const fixedCanvas = example.presentation.canvas;

    return {
        resolution: fixedCanvas ?? {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight
        }
    };
}

async function createGraphic() {
    const nextGraphic = document.createElement(GRAPHIC_TAG);
    nextGraphic.id = 'graphic';
    canvas.append(nextGraphic);

    try {
        await nextGraphic.load({
            data: getDefaultData(manifest.schema),
            renderType: 'realtime',
            renderCharacteristics: renderCharacteristics()
        });
        graphic = nextGraphic;
    } catch (error) {
        nextGraphic.remove();
        throw error;
    }
}

async function recreateGraphic() {
    const previousGraphic = graphic;
    graphic = null;

    try {
        await previousGraphic?.dispose({});
    } catch (error) {
        console.error('Unable to dispose the previous OGraf graphic.', error);
    } finally {
        previousGraphic?.remove();
    }

    await createGraphic();
}

async function handleMessage({ data, origin, source }) {
    if (source !== window.parent || origin !== MESSAGE_ORIGIN) return;
    const { action, data: payload } = data ?? {};
    if (!action) return;
    if (isResetting && action !== 'ping') return;

    switch (action) {
        case 'ping':
            if (graphic) notifyParent({ event: 'ready' });
            break;
        case 'play':
            if (payload && Object.keys(payload).length) {
                await graphic.updateAction({ data: payload, skipAnimation: true });
            }
            {
                const result = await graphic.playAction({ goto: 0, skipAnimation: false });
                notifyParent({ event: 'state', state: result?.result });
            }
            notifyParent({ event: 'playing' });
            break;
        case 'step': {
            const result = await graphic.playAction({
                goto: payload?.goto,
                delta: payload?.delta,
                skipAnimation: false
            });
            notifyParent({ event: 'state', state: result?.result });
            if (result?.currentStep === undefined) notifyParent({ event: 'stopped' });
            break;
        }
        case 'stop':
            if (isResetting) break;
            isResetting = true;
            notifyParent({ event: 'resetting' });
            try {
                try {
                    await graphic.stopAction({ skipAnimation: false });
                } catch (error) {
                    console.error('Unable to stop the current OGraf graphic.', error);
                }
                await recreateGraphic();
                notifyParent({ event: 'stopped' });
            } finally {
                isResetting = false;
            }
            break;
        case 'update':
            await graphic.updateAction({ data: payload ?? {}, skipAnimation: false });
            break;
        case 'custom': {
            const result = await graphic.customAction({
                id: payload?.id,
                payload: payload?.payload ?? payload,
                skipAnimation: false
            });
            notifyParent({ event: 'state', state: result?.result });
            break;
        }
    }
}

async function initialisePlayer() {
    const catalogue = await loadDemoCatalog();
    const requestedId = new URLSearchParams(window.location.search).get('example');
    example = findDemoExample(catalogue, requestedId);

    const manifestUrl = resolveSitePath(example.manifest);
    manifest = await loadJson(manifestUrl);
    const moduleUrl = new URL(manifest.main, manifestUrl);
    const graphicModule = await import(moduleUrl.href);
    if (typeof graphicModule.default !== 'function') {
        throw new Error(`${manifest.main} does not export an OGraf Graphic class`);
    }

    setupBackground(example.presentation.background);
    setupCanvas();
    customElements.define(GRAPHIC_TAG, graphicModule.default);

    window.addEventListener('resize', fitCanvas);
    window.addEventListener('message', handleMessage);
    await createGraphic();
    fitCanvas();
    document.title = `OGraf Example — ${example.title}`;
    notifyParent({ event: 'ready' });
}

initialisePlayer().catch(error => {
    console.error(error);
    notifyParent({ event: 'error', message: error.message });
});
