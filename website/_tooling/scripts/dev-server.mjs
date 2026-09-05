import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..', '..', '..');
const SITE_ROOT = resolve(process.cwd(), process.env.SITE_ROOT || REPOSITORY_ROOT);
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const PREVIEW_PREFIX = '/ograf';

const CONTENT_TYPES = {
    '.avif': 'image/avif',
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.yaml': 'application/yaml; charset=utf-8',
    '.yml': 'application/yaml; charset=utf-8',
    '.zip': 'application/zip'
};

function stripPreviewPrefix(pathname) {
    if (pathname === PREVIEW_PREFIX) return '/';
    if (pathname.startsWith(`${PREVIEW_PREFIX}/`)) {
        return pathname.slice(PREVIEW_PREFIX.length);
    }

    return pathname;
}

function resolveRequestPath(pathname) {
    const decodedPath = decodeURIComponent(stripPreviewPrefix(pathname));
    const relativeRequestPath = decodedPath.replace(/^\/+/, '');
    const candidatePath = resolve(SITE_ROOT, relativeRequestPath || 'index.html');
    const pathFromRoot = relative(SITE_ROOT, candidatePath);

    if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || isAbsolute(pathFromRoot)) {
        return null;
    }

    return candidatePath;
}

async function resolveFilePath(candidatePath) {
    try {
        const fileStats = await stat(candidatePath);
        if (fileStats.isDirectory()) return resolve(candidatePath, 'index.html');

        return candidatePath;
    } catch {
        return candidatePath;
    }
}

function sendResponse(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
    response.writeHead(statusCode, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(body);
}

const server = createServer(async (request, response) => {
    try {
        const requestUrl = new URL(request.url, `http://${request.headers.host}`);
        const candidatePath = resolveRequestPath(requestUrl.pathname);
        if (!candidatePath) {
            sendResponse(response, 403, 'Forbidden');
            return;
        }

        const filePath = await resolveFilePath(candidatePath);
        const body = await readFile(filePath);
        const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()]
            || 'application/octet-stream';

        response.writeHead(200, {
            'Content-Length': body.length,
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        });
        response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            sendResponse(response, 404, 'Not found');
            return;
        }

        console.error(error);
        sendResponse(response, 500, 'Internal server error');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`OGraf website: http://${HOST}:${PORT} (root: ${SITE_ROOT})`);
});
