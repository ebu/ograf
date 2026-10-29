import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { REPOSITORY_ROOT, isInside, localFile, readJson } from '../../scripts/content-utils.mjs';
import { updateDemoCatalog } from '../../scripts/update-demo-catalog.mjs';
import { updateManifests } from '../../scripts/update-manifests.mjs';

export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
export async function fixture(test) {
    const root = await mkdtemp(resolve(tmpdir(), 'ograf-content-'));
    test.after(async () => {
        assert(isInside(resolve(tmpdir()), root) && root.startsWith(resolve(tmpdir(), 'ograf-content-')));
        await rm(root, { recursive:true, force:true });
    });
    const put = async (path, contents) => { await mkdir(dirname(resolve(root,path)), {recursive:true}); await writeFile(resolve(root,path), contents); };
    const json = (path, value) => put(path, `${JSON.stringify(value, null, 2)}\n`);
    const catalog = { version:1, examples:[] };
    async function example(id) {
        const directory = `v1/examples/${id}`;
        await put(`${directory}/graphic.mjs`, 'export default class Graphic {}\n');
        await put(`${directory}/thumbnail.png`, PNG);
        await put(`${directory}/README.md`, '# Example\n');
        await json(`${directory}/manifest.ograf.json`, {$schema:'https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json',name:`Example ${id}`, id:`example-${id}`, main:'graphic.mjs',
            supportsRealTime:true, supportsNonRealTime:false, schema:{type:'object',properties:{}},
            thumbnails:[{file:'thumbnail.png',resolution:{width:1,height:1}}]});
        catalog.examples.push({id, title:`Example ${id}`, manifest:`${directory}/manifest.ograf.json`, archiveName:`${id}.zip`,
            presentation:{renderer:'viewport'}});
    }
    const card = id => `<section class="demo-carousel__slide" data-example-id="${id}" id="slide-${id}" role="tabpanel" aria-labelledby="tab-${id}"><h2>Example ${id}</h2><a href="#" data-example-download="${id}">Download</a><iframe title="Example ${id}" data-src="website/demo-player/index.html?example=${id}"></iframe></section>`;
    async function html(ids = catalog.examples.map(x=>x.id)) {
        await put('index.html', `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Content fixture</title><meta name="robots" content="index,follow"></head><body><main><h1>Examples</h1>${ids.map(card).join('')}<div role="tablist">${ids.map(id=>`<button type="button" class="demo-carousel__dot" data-example-id="${id}" id="tab-${id}" role="tab" aria-controls="slide-${id}">Example ${id}</button>`).join('')}</div></main></body></html>\n`);
    }
    await example('first');
    await html();
    await json('website/demo-catalog.json', catalog);
    await put('website/demo-player/index.html', '<!DOCTYPE html><html lang="en"><head><title>Player</title><meta name="robots" content="noindex,nofollow"></head><body><h1>Player</h1></body></html>');
    await put('website/js/site.js', 'export const ready = true;\n');
    await put('website/css/style.css', 'body { color: black; }\n');
    for (const directory of ['hero','vendors','organisations']) {
        await put(`website/assets/img/vendor-logos/${directory}/one.svg`, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>');
        await json(`website/assets/img/vendor-logos/${directory}/manifest.json`, directory === 'hero' ? ['one.svg']
            : [{file:'one.svg',name:'One',url:'https://example.com/'}]);
    }
    await cp(resolve(REPOSITORY_ROOT,'v1/specification/json-schemas'), resolve(root,'v1/specification/json-schemas'), {recursive:true});
    for (const path of ['v1/specification/docs/Specification.md','v1/specification/docs/Specification_Server_API.md','CHANGELOG.md']) await put(path, '# Documentation\n');
    await put('v1/specification/open-api/docs/index.html', '<!doctype html><title>API</title>');
    await put('CNAME', 'ograf.ebu.io\n');
    await put('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://ograf.ebu.io/sitemap.xml\n');
    await put('sitemap.xml', `<urlset>${['','v1/specification/docs/Specification.html','v1/specification/docs/Specification_Server_API.html','v1/specification/open-api/docs/','CHANGELOG.html'].map(path=>`<url><loc>https://ograf.ebu.io/${path}</loc></url>`).join('')}</urlset>`);
    await json('site.webmanifest', {name:'Fixture',icons:[]});
    async function update() { await json('website/demo-catalog.json',catalog); await updateDemoCatalog(root); }
    await update();
    return {root,put,json,catalog,example,html,update,read: path=>readFile(resolve(root,path),'utf8'),
        readJson:path=>readJson(resolve(root,path)), logos:check=>updateManifests(root,check),
        remove:async path=>unlink(await localFile(root,path))};
}
