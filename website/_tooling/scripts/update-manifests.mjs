import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..', '..', '..');
const LOGO_ROOT = resolve(REPOSITORY_ROOT, 'website/assets/img/vendor-logos');
const SUPPORTED_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const CHECK_ONLY = process.argv.includes('--check');

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

async function updateManifest(manifest) {
    const directoryPath = resolve(LOGO_ROOT, manifest.directory);
    const manifestPath = resolve(directoryPath, 'manifest.json');
    const [diskFiles, existingContents] = await Promise.all([
        listLogoFiles(directoryPath),
        readFile(manifestPath, 'utf8')
    ]);
    const existingEntries = parseManifest(existingContents, manifestPath);
    const outputEntries = manifest.format === 'strings'
        ? diskFiles
        : buildObjectManifest(existingEntries, diskFiles);
    const outputContents = `${JSON.stringify(outputEntries, null, 2)}\n`;

    if (CHECK_ONLY) {
        if (outputContents !== existingContents) {
            throw new Error(`Manifest is not up to date: ${manifestPath}`);
        }
        return;
    }

    await writeFile(manifestPath, outputContents, 'utf8');
    console.log(`Updated ${manifest.directory}/manifest.json (${outputEntries.length} entries)`);
}

await Promise.all(MANIFESTS.map(updateManifest));
