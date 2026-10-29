import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, parse, resolve } from 'node:path';
import { cliRoot, isMain, isSafePath, sameJson, UPDATE_HINT } from './content-utils.mjs';

const SUPPORTED_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

const MANIFESTS = [
    { directory: 'hero', format: 'strings' },
    { directory: 'vendors', format: 'objects' },
    { directory: 'organisations', format: 'objects' }
];

async function listLogoFiles(directoryPath) {
    const directoryEntries = await readdir(directoryPath, { withFileTypes: true });

    return directoryEntries
        .filter(entry => entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
        .map(entry => entry.name)
        .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }));
}

function guessName(fileName) {
    const parsedName = parse(fileName).name.replace(/\.svg$/i, '');

    return parsedName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseManifest(contents, manifestPath) {
    let parsedManifest;
    try {
        parsedManifest = JSON.parse(contents);
    } catch (error) {
        throw new Error(`Invalid JSON in ${manifestPath}: ${error.message}`);
    }

    if (!Array.isArray(parsedManifest)) {
        throw new Error(`Manifest must contain an array: ${manifestPath}`);
    }

    return parsedManifest;
}

function buildObjectManifest(existingEntries, diskFiles) {
    const filesOnDisk = new Set(diskFiles);
    const seenFiles = new Set();
    const outputEntries = [];

    for (const existingEntry of existingEntries) {
        const fileName = typeof existingEntry === 'string' ? existingEntry : existingEntry?.file;
        if (!fileName || !filesOnDisk.has(fileName) || seenFiles.has(fileName)) continue;

        outputEntries.push(typeof existingEntry === 'string'
            ? { file: fileName, name: guessName(fileName), url: '' }
            : existingEntry);
        seenFiles.add(fileName);
    }

    for (const fileName of diskFiles) {
        if (seenFiles.has(fileName)) continue;
        outputEntries.push({ file: fileName, name: guessName(fileName), url: '' });
    }

    return outputEntries;
}

async function updateManifest(root, manifest, check) {
    const directoryPath = resolve(root, 'website/assets/img/vendor-logos', manifest.directory);
    const manifestPath = resolve(directoryPath, 'manifest.json');
    const [diskFiles, existingContents] = await Promise.all([
        listLogoFiles(directoryPath),
        readFile(manifestPath, 'utf8')
    ]);
    const existingEntries = parseManifest(existingContents, manifestPath);
    const seen = new Set();
    for (const entry of existingEntries) {
        const file = typeof entry === 'string' ? entry : entry?.file;
        if (!isSafePath(file) || file.includes('/') || seen.has(file)) {
            throw new Error(`${manifestPath}: invalid or duplicate logo file ${file}`);
        }
        seen.add(file);
        if (typeof entry === 'object' && entry.url && !/^https?:\/\//.test(entry.url)) {
            throw new Error(`${manifestPath} [${file}]: URL must use HTTP or HTTPS`);
        }
    }
    const outputEntries = manifest.format === 'strings'
        ? [...existingEntries.filter(file => diskFiles.includes(file)),
            ...diskFiles.filter(file => !existingEntries.includes(file))]
        : buildObjectManifest(existingEntries, diskFiles);
    const outputContents = `${JSON.stringify(outputEntries, null, 2)}\n`;

    if (check) {
        // Hero order is editorial too: compare its file set, not directory order.
        const current = manifest.format === 'strings' ? [...existingEntries].sort() : existingEntries;
        const expected = manifest.format === 'strings' ? [...outputEntries].sort() : outputEntries;
        if (!sameJson(expected, current)) {
            throw new Error(`${manifestPath}: logo files are not up to date. ${UPDATE_HINT}`);
        }
        return;
    }

    await writeFile(manifestPath, outputContents, 'utf8');
    console.log(`Updated ${manifest.directory}/manifest.json (${outputEntries.length} entries)`);
}

export async function updateManifests(root, check = false) {
    await Promise.all(MANIFESTS.map(manifest => updateManifest(root, manifest, check)));
}

if (isMain(import.meta.url)) {
    try { await updateManifests(cliRoot(), process.argv.includes('--check')); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
