import { isDeepStrictEqual } from 'node:util';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const UPDATE_HINT = 'Run npm --prefix website/_tooling run content:update.';
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export const sameJson = isDeepStrictEqual;
export const repositoryPath = (root, path) => relative(root, path).split(sep).join('/');

export function isInside(parent, child) {
    const path = relative(parent, child);
    return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export function isSafePath(path) {
    if (typeof path !== 'string' || !path || /[\\\x00-\x1f?#]/.test(path)) return false;
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return false; }
    return !decoded.startsWith('/') && !/[\\\x00-\x1f?#]/.test(decoded)
        && !/^[a-z][a-z\d+.-]*:/i.test(decoded)
        && !decoded.split('/').some(part => !part || part === '.' || part === '..');
}

export async function localFile(root, path) {
    if (!isSafePath(path)) throw new Error(`Unsafe relative file path: ${path}`);
    const file = resolve(root, path);
    if (!isInside(await realpath(root), await realpath(file)) || !(await stat(file)).isFile()) {
        throw new Error(`File must stay inside ${root}: ${path}`);
    }
    return file;
}

export async function walkFiles(directory, { exclude = [] } = {}) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === '.DS_Store' || exclude.includes(entry.name)) continue;
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walkFiles(path, { exclude }));
        else if (entry.isFile()) files.push(path);
        else throw new Error(`Unsupported symlink or special file: ${path}`);
    }
    return files.sort();
}

export function cliRoot() {
    const index = process.argv.indexOf('--root');
    if (index < 0) return REPOSITORY_ROOT;
    if (!process.argv[index + 1]) throw new Error('--root requires a directory');
    return resolve(process.argv[index + 1]);
}

export const isMain = url => process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url);
