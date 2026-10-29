import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { isSafePath, sameJson } from '../../scripts/content-utils.mjs';
import { updateDemoCatalog } from '../../scripts/update-demo-catalog.mjs';
import { validateSite } from '../../scripts/validate-site.mjs';
import { selectHeroThumbnail } from '../../../js/demo-catalog.js';
import { createZipArchive } from '../../../js/zip-archive.js';
import { readZip } from '../helpers/read-zip.mjs';
import { fixture, PNG } from '../helpers/content-fixture.mjs';

const clean = async root => { const result=await validateSite(root); assert.deepEqual(result.errors,[]); return result; };

test('content can be added, removed, reordered and reformatted without changing validation', async t => {
    const f=await fixture(t);
    await clean(f.root);
    await f.put('index.html',(await f.read('index.html')).replace('index,follow','follow,index,max-image-preview:large'));
    await clean(f.root);
    await f.put('v1/examples/first/assets/new.txt', 'Additional content\n');
    await f.put('v1/examples/first/README.md', '# Edited content\n');
    await f.put('v1/examples/first/extra-thumbnail.png', PNG);
    await f.example('second'); await f.example('third');
    await f.update(); await f.html(['third','first','second']);
    await clean(f.root);
    f.catalog.examples=f.catalog.examples.filter(example=>example.id!=='first').reverse();
    await f.update(); await f.html(['third','second']); await clean(f.root);
    const parsed=await f.readJson('website/demo-catalog.json');
    await f.put('website/demo-catalog.json', JSON.stringify({examples:parsed.examples,version:parsed.version},null,8).replace(/\n/g,'\r\n'));
    await clean(f.root);
    for (const group of ['hero','vendors','organisations']) {
        await f.put(`website/assets/img/vendor-logos/${group}/two.svg`, '<svg xmlns="http://www.w3.org/2000/svg"/>');
    }
    await f.logos();
    const logos=await f.readJson('website/assets/img/vendor-logos/vendors/manifest.json');
    logos[0].name='Edited publisher'; logos[0].url='https://example.org/changed';
    await f.json('website/assets/img/vendor-logos/vendors/manifest.json',logos.reverse());
    await clean(f.root);
    assert.deepEqual(await f.readJson('website/assets/img/vendor-logos/vendors/manifest.json'),logos);
    for (const group of ['hero','vendors','organisations']) {
        await f.remove(`website/assets/img/vendor-logos/${group}/two.svg`);
        await f.put(`website/assets/img/vendor-logos/${group}/renamed.svg`, '<svg xmlns="http://www.w3.org/2000/svg"/>');
    }
    await f.logos(); await clean(f.root);
    const retained=(await f.readJson('website/assets/img/vendor-logos/vendors/manifest.json')).find(entry=>entry.file==='one.svg');
    assert.equal(retained.name,'Edited publisher');
    assert.equal(retained.url,'https://example.org/changed');
});

test('stale hashes fail without changing the source catalogue; hashes use actual bytes',async t=>{
    const f=await fixture(t);
    const before=await f.read('website/demo-catalog.json');
    await f.put('v1/examples/first/README.md','# Example\r\n');
    const result=await validateSite(f.root);
    assert(result.errors.some(error=>error.includes('hashes are outdated') && error.includes('content:update')));
    assert.equal(await f.read('website/demo-catalog.json'),before);
    await f.update();
    const catalogue=await f.readJson('website/demo-catalog.json');
    const entry=catalogue.examples[0].files.find(file=>file.archive==='README.md');
    assert.equal(entry.sha256,createHash('sha256').update('# Example\r\n').digest('hex'));
    await clean(f.root);
});

test('invalid catalogue IDs, main files, archive paths and presentation fail',async t=>{
    const f=await fixture(t);
    const first=structuredClone(f.catalog.examples[0]);
    f.catalog.examples.push(structuredClone(first));
    await assert.rejects(f.update(),/duplicate example ID/);
    f.catalog.examples=[first];
    first.packageExtras=[{source:'v1/examples/first/README.md',archive:'../escape.txt'}];
    await assert.rejects(f.update(),/Unsafe archive path/);
    first.packageExtras=[{source:'v1/examples/first/README.md',archive:'README.md'}];
    await assert.rejects(f.update(),/Duplicate archive path/);
    delete first.packageExtras;
    const manifest=await f.readJson(first.manifest);
    await f.json(first.manifest,{...manifest,main:'missing.mjs'});
    await assert.rejects(f.update(),/missing.mjs/);
    await f.json(first.manifest,manifest);
    first.presentation={renderer:'unknown'}; await f.update();
    assert((await validateSite(f.root)).errors.some(error=>error.includes('Unsupported renderer')));
    first.presentation={renderer:'viewport'};
    await f.json(first.manifest,{...manifest,supportsRealTime:'invalid'}); await f.update();
    assert((await validateSite(f.root)).errors.some(error=>error.includes('must be boolean')));
    f.catalog.examples=[];
    await assert.rejects(f.update(),/at least one example/);
});

test('missing media, broken card references and duplicate cards fail',async t=>{
    const f=await fixture(t);
    f.catalog.examples[0].presentation.background={type:'image',src:'website/missing.png'};
    await f.update(); assert((await validateSite(f.root)).errors.some(error=>error.includes('missing.png')));
    delete f.catalog.examples[0].presentation.background; await f.update();
    const html=await f.read('index.html');
    await f.put('index.html',html.replace('data-example-download="first"','data-example-download="other"'));
    assert((await validateSite(f.root)).errors.some(error=>error.includes('download must reference')));
    await f.html(['first','first']);
    assert((await validateSite(f.root)).errors.some(error=>error.includes('exactly once')));
    await f.html(); await f.put('index.html',html.replace('example=first','example=other'));
    assert((await validateSite(f.root)).errors.some(error=>error.includes('player must reference')));
    await f.put('index.html',html.replace('</main>','<a href="#missing-section">Missing section</a></main>'));
    assert((await validateSite(f.root)).errors.some(error=>error.includes('missing navigation target')));
});

test('size budgets warn, while referenced missing files remain failures',async t=>{
    const f=await fixture(t);
    await f.put('v1/examples/first/thumbnail.png',Buffer.concat([PNG,Buffer.alloc(500_000)]));
    await f.update();
    const result=await clean(f.root);
    assert(result.warnings.some(message=>message.includes('500 KB')));
    await f.put('website/css/style.css','body{background:url("missing.png")}');
    assert((await validateSite(f.root)).errors.some(message=>message.includes('missing.png')));
});

test('path handling and JSON comparison are semantic and platform independent',()=>{
    for(const path of ['../a','/a','C:/a','a\\b','a/%2e%2e/b','https://example.com/a','a\0b','a?query']) assert.equal(isSafePath(path),false,path);
    for(const path of ['a/b.json','assets/hello-world.webp']) assert.equal(isSafePath(path),true,path);
    assert(sameJson({a:1,b:[1,2]},{b:[1,2],a:1}));
    assert(!sameJson([1,2],[2,1]));
});

test('thumbnail selection uses size and ratio, with a fallback for unspecified dimensions',()=>{
    const options=[{file:'portrait.webp',resolution:{width:1080,height:1920}},
        {file:'large.webp',resolution:{width:1920,height:1080}},
        {file:'medium.webp',resolution:{width:1280,height:720}},
        {file:'small.webp',resolution:{width:480,height:270}}];
    assert.equal(selectHeroThumbnail(options).file,'medium.webp');
    assert.equal(selectHeroThumbnail([{file:'first.webp'},{file:'second.webp'}]).file,'first.webp');
});

test('hero selection honours editorial choices, ignores GIF and does not prefer a format',()=>{
    const gif={file:'animation.GIF',resolution:{width:640,height:360}};
    const photo={file:'photo.webp',resolution:{width:1280,height:720}};
    const graphic={file:'graphic.png',resolution:{width:1280,height:720}};
    const portrait={file:'chosen.jpeg',resolution:{width:200,height:400}};
    const options=[gif,photo,graphic,portrait];
    assert.equal(selectHeroThumbnail(options).file,'photo.webp');
    assert.equal(selectHeroThumbnail([graphic,photo]).file,'graphic.png');
    assert.equal(selectHeroThumbnail(options,'chosen.jpeg'),portrait);
    assert.deepEqual(options,[gif,photo,graphic,portrait]);
    assert.equal(selectHeroThumbnail([{file:'first.gif'},{file:'second.jpg'}]).file,'second.jpg');
    assert.equal(selectHeroThumbnail([gif]),null);
    assert.equal(selectHeroThumbnail([]),null);
    for(const invalid of ['animation.GIF','animation.%67if','../photo.webp','https://example.com/photo.webp',null,'']) {
        assert.throws(()=>selectHeroThumbnail(options,invalid),/presentation.heroThumbnail/);
    }
    assert.throws(()=>selectHeroThumbnail(options,'missing.png'),/not declared/);
});

test('catalogue hero choices survive generation and fail for broken or GIF references',async t=>{
    const f=await fixture(t);
    const example=f.catalog.examples[0];
    const manifest=await f.readJson(example.manifest);
    await f.put('v1/examples/first/editorial.png',PNG);
    manifest.thumbnails.push({file:'editorial.png',resolution:{width:1,height:1}});
    await f.json(example.manifest,manifest);
    example.presentation.heroThumbnail='editorial.png';
    await f.update(); await clean(f.root);
    assert.equal((await f.readJson('website/demo-catalog.json')).examples[0].presentation.heroThumbnail,'editorial.png');
    for(const invalid of ['missing.png','thumbnail.gif','../thumbnail.png',null]) {
        example.presentation.heroThumbnail=invalid; await f.update();
        assert((await validateSite(f.root)).errors.some(error=>error.includes('[first]') && error.includes('presentation.heroThumbnail')));
    }
    example.presentation.heroThumbnail='editorial.png';
    await f.remove('v1/examples/first/editorial.png'); await f.update();
    assert((await validateSite(f.root)).errors.some(error=>error.includes('editorial.png')));
    delete example.presentation.heroThumbnail;
    await f.update(); await clean(f.root);
    manifest.thumbnails=[{file:'only.gif',resolution:{width:640,height:360}}];
    await f.put('v1/examples/first/only.gif',Buffer.from('GIF89a'));
    await f.json(example.manifest,manifest); await f.update();
    assert((await validateSite(f.root)).errors.some(error=>error.includes('Missing supported hero thumbnail')));
});

test('ZIP reader checks nested UTF-8 names, bytes, CRC and central-directory corruption',()=>{
    // Independently produced by System.IO.Compression.ZipArchive (deflate).
    const deflated = Buffer.from('UEsDBBQAAAAIAL1kXV3aikMLHwAAABcAAAAMAAAAZGVmbGF0ZWQudHh08sxLSS1IzUtJzStRiPIMUEjLrCgpLUoFAAAA//8DAFBLAQIUABQAAAAIAL1kXV3aikMLHwAAABcAAAAMAAAAAAAAAAAAAAAAAAAAAABkZWZsYXRlZC50eHRQSwUGAAAAAAEAAQA6AAAASQAAAAAA', 'base64');
    assert.equal(readZip(deflated).get('deflated.txt').toString(), 'Independent ZIP fixture');
    const entries=[{path:'folder/Grüße.txt',contents:Buffer.from('Hello\r\n')},{path:'binary.bin',contents:Buffer.from([0,1,255])}];
    const archive=Buffer.from(createZipArchive(entries));
    const files=readZip(archive);
    for(const entry of entries) assert.deepEqual(files.get(entry.path),entry.contents);
    const damaged=Buffer.from(archive);
    const nameLength=damaged.readUInt16LE(26), extraLength=damaged.readUInt16LE(28);
    damaged[30+nameLength+extraLength]^=1;
    assert.throws(()=>readZip(damaged),/CRC/);
    const missingDirectory=Buffer.from(archive); missingDirectory[missingDirectory.length-22+12]^=1;
    assert.throws(()=>readZip(missingDirectory),/directory bounds/);
    assert.throws(()=>readZip(Buffer.from('not a zip')));
});
