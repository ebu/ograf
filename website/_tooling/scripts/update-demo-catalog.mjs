import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
    cliRoot, isInside, isMain, isSafePath, localFile, readJson,
    repositoryPath, sameJson, UPDATE_HINT, walkFiles
} from './content-utils.mjs';

export async function buildDemoCatalog(root, catalogue) {
    if (catalogue.version !== 1 || !Array.isArray(catalogue.examples) || !catalogue.examples.length) {
        throw new Error('website/demo-catalog.json must contain version 1 and at least one example');
    }
    const ids = new Set();
    const examples = [];
    for (const example of catalogue.examples) {
        try {
            if (typeof example.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(example.id) || ids.has(example.id)) {
                throw new Error(`Invalid or duplicate example ID: ${example.id}`);
            }
            ids.add(example.id);
            if (typeof example.title !== 'string' || !example.title.trim()) throw new Error('Missing title');
            if (!isSafePath(example.archiveName) || example.archiveName.includes('/')
                || !example.archiveName.endsWith('.zip')) throw new Error('archiveName must be a ZIP basename');
            const manifestPath = await localFile(root, example.manifest);
            const directory = dirname(manifestPath);
            if (!isInside(resolve(root, 'v1/examples'), directory)) {
                throw new Error('manifest must be inside a package directory in v1/examples');
            }
            const manifest = await readJson(manifestPath);
            const main = await localFile(directory, manifest.main);
            const files = await walkFiles(directory);
            if (!files.includes(main)) throw new Error(`Missing main file: ${manifest.main}`);
            const entries = [];
            async function add(source, archive) {
                if (!isSafePath(archive)) throw new Error(`Unsafe archive path: ${archive}`);
                const contents = await readFile(source);
                entries.push({ source: repositoryPath(root, source), archive,
                    sha256: createHash('sha256').update(contents).digest('hex') });
            }
            for (const file of files) await add(file, repositoryPath(directory, file));
            for (const extra of example.packageExtras ?? []) {
                await add(await localFile(root, extra.source), extra.archive);
            }
            entries.sort((a, b) => a.archive < b.archive ? -1 : a.archive > b.archive ? 1 : 0);
            if (new Set(entries.map(file => file.archive)).size !== entries.length) {
                throw new Error('Duplicate archive path');
            }
            examples.push({ ...example, files: entries });
        } catch (error) {
            throw new Error(`website/demo-catalog.json [${example.id ?? 'unknown'}]: ${error.message}`);
        }
    }
    return { ...catalogue, examples };
}

export async function updateDemoCatalog(root, check = false) {
    const path = resolve(root, 'website/demo-catalog.json');
    const current = await readJson(path);
    const updated = await buildDemoCatalog(root, current);
    if (check) {
        if (!sameJson(current, updated)) {
            const changed = updated.examples.filter((example, i) => !sameJson(example.files, current.examples[i].files));
            throw new Error(`website/demo-catalog.json: files or hashes are outdated for ${changed.map(x => x.id).join(', ')}. ${UPDATE_HINT} Text file hashes use exact bytes; check LF line endings on Windows.`);
        }
    } else {
        await writeFile(path, `${JSON.stringify(updated, null, 4)}\n`, 'utf8');
    }
}

if (isMain(import.meta.url)) {
    try {
        await updateDemoCatalog(cliRoot(), process.argv.includes('--check'));
        console.log('Demo catalogue updated or verified.');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
