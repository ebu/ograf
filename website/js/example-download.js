import {
    findDemoExample,
    loadDemoCatalog,
    resolveSitePath
} from './demo-catalog.js';
import { createZipArchive } from './zip-archive.js';

const downloadStatus = document.createElement('span');
downloadStatus.className = 'sr-only';
downloadStatus.setAttribute('role', 'status');
downloadStatus.setAttribute('aria-live', 'polite');
downloadStatus.setAttribute('aria-atomic', 'true');
document.body.append(downloadStatus);

let cataloguePromise;

function toHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function fetchPackageFile(file) {
    const url = resolveSitePath(file.source);
    url.searchParams.set('v', file.sha256.slice(0, 12));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to download ${file.source}`);

    const contents = new Uint8Array(await response.arrayBuffer());
    const digest = await crypto.subtle.digest('SHA-256', contents);
    if (toHex(digest) !== file.sha256) {
        throw new Error(`Integrity check failed for ${file.source}`);
    }

    return { path: file.archive, contents };
}

function triggerDownload(contents, fileName) {
    const blob = new Blob([contents], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function downloadExample(link) {
    if (link.getAttribute('aria-busy') === 'true') return;

    const label = link.querySelector('span');
    const originalLabel = label?.textContent;
    link.setAttribute('aria-busy', 'true');
    if (label) label.textContent = 'Preparing download...';

    try {
        cataloguePromise ??= loadDemoCatalog();
        const catalogue = await cataloguePromise;
        const example = findDemoExample(catalogue, link.dataset.exampleDownload);
        const files = await Promise.all(example.files.map(fetchPackageFile));
        triggerDownload(createZipArchive(files), example.archiveName);
        downloadStatus.textContent = `${example.title} download ready.`;
    } catch (error) {
        console.error(error);
        downloadStatus.textContent = 'The OGraf example download could not be prepared.';
    } finally {
        link.removeAttribute('aria-busy');
        if (label) label.textContent = originalLabel;
    }
}

document.addEventListener('click', event => {
    const link = event.target.closest('[data-example-download]');
    if (!link) return;

    event.preventDefault();
    downloadExample(link);
});
