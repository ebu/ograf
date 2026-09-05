import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..', '..', '..');
const EXAMPLES_ROOT = resolve(REPOSITORY_ROOT, 'v1/examples');
const CATALOG_PATH = resolve(REPOSITORY_ROOT, 'website/demo-catalog.json');
const CHECK_ONLY = process.argv.includes('--check');

function toRepositoryPath(path) {
    return relative(REPOSITORY_ROOT, path).split(sep).join('/');
}

function isInside(parent, child) {
    const childPath = relative(parent, child);

    return childPath && !childPath.startsWith('..') && !childPath.includes(`${sep}..${sep}`);
}

async function walkFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name === '.DS_Store') continue;
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walkFiles(entryPath));
        else if (entry.isFile()) files.push(entryPath);
    }

    return files.sort();
}

async function createFileEntry(sourcePath, archivePath) {
    const contents = await readFile(sourcePath);

    return {
        source: toRepositoryPath(sourcePath),
        archive: archivePath.split(sep).join('/'),
        sha256: createHash('sha256').update(contents).digest('hex')
    };
}

async function collectExampleFiles(example) {
    const manifestPath = resolve(REPOSITORY_ROOT, example.manifest);
    const exampleDirectory = dirname(manifestPath);
    if (!isInside(EXAMPLES_ROOT, exampleDirectory)) {
        throw new Error(`${example.id} manifest must be inside v1/examples`);
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const packageFiles = await walkFiles(exampleDirectory);
    const mainPath = resolve(exampleDirectory, manifest.main);
    if (!packageFiles.includes(mainPath)) {
        throw new Error(`${example.id} manifest main file is missing: ${manifest.main}`);
    }

    const entries = await Promise.all(packageFiles.map(filePath => (
        createFileEntry(filePath, relative(exampleDirectory, filePath))
    )));
    for (const extra of example.packageExtras ?? []) {
        const sourcePath = resolve(REPOSITORY_ROOT, extra.source);
        if (!isInside(REPOSITORY_ROOT, sourcePath)) {
            throw new Error(`${example.id} contains an unsafe package extra`);
        }
        entries.push(await createFileEntry(sourcePath, extra.archive));
    }

    entries.sort((left, right) => {
        if (left.archive < right.archive) return -1;
        if (left.archive > right.archive) return 1;
        return 0;
    });
    const archivePaths = new Set();
    for (const entry of entries) {
        if (archivePaths.has(entry.archive)) {
            throw new Error(`${example.id} contains duplicate archive path ${entry.archive}`);
        }
        archivePaths.add(entry.archive);
    }

    return entries;
}

const catalogue = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
const examples = [];
for (const example of catalogue.examples) {
    examples.push({
        ...example,
        files: await collectExampleFiles(example)
    });
}

const updatedContents = `${JSON.stringify({ ...catalogue, examples }, null, 4)}\n`;
const currentContents = await readFile(CATALOG_PATH, 'utf8');

if (CHECK_ONLY && currentContents !== updatedContents) {
    console.error('website/demo-catalog.json is outdated');
    process.exitCode = 1;
} else if (CHECK_ONLY) {
    console.log('Demo catalogue verified.');
} else {
    await writeFile(CATALOG_PATH, updatedContents, 'utf8');
    console.log('Demo catalogue updated.');
}
