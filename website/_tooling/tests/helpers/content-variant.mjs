// Controlled editorial variants use the real page, CSS, generic controls and
// Graphic packages, but don't depend on a particular real card or logo existing.
function applyVariant({ids,id,title,metadata,fields}) {
    const track=document.querySelector('.demo-carousel__track');
    const tabList=document.querySelector('.demo-carousel__dots');
    const slide=document.createElement('div');
    slide.className='demo-carousel__slide'; slide.dataset.exampleId=id;
    slide.id=`fixture-slide-${id}`; slide.setAttribute('role','tabpanel');
    slide.setAttribute('aria-labelledby',`fixture-tab-${id}`);
    slide.innerHTML=`<div class="demo-card" data-demo-controller>
        <div class="demo-card__header"><h3 class="demo-card__title"></h3><a class="demo-card__download" href="#" data-example-download>Download</a></div>
        <div class="demo-card__body"><div class="demo-player-stage"><div class="demo-player" data-demo-player data-ratio="16/9">
        <iframe class="demo-player__iframe" title="Content fixture" data-demo-iframe></iframe></div></div>
        <div class="demo-controls"><div class="demo-controls__actions">
        <button type="button" data-demo-action="play" disabled>Play</button>
        <button type="button" data-demo-action="update" disabled>Update</button>
        <button type="button" data-demo-action="stop" disabled>Stop</button></div>
        <div class="demo-controls__fields"><label>Text<input data-demo-field="fixtureText" value="Initial"></label>
        <label>Number<input type="number" data-demo-field="fixtureNumber" data-demo-value-type="number" value="2"></label></div>
        <span class="demo-status" data-demo-status role="status" aria-live="polite">Loading...</span></div></div></div>`;
    slide.querySelector('[data-demo-controller]').dataset.demoController=id;
    slide.querySelector('[data-example-download]').dataset.exampleDownload=id;
    slide.querySelector('iframe').dataset.src=`website/demo-player/index.html?example=${id}`;
    slide.querySelector('.demo-card__title').textContent=title;
    if(!fields) slide.querySelector('.demo-controls__fields').remove();
    const tab=document.createElement('button');
    tab.className='demo-carousel__dot'; tab.id=`fixture-tab-${id}`; tab.type='button';
    tab.dataset.exampleId=id; tab.setAttribute('role','tab'); tab.setAttribute('aria-controls',slide.id); tab.setAttribute('aria-label',title);
    track.append(slide); tabList.append(tab);
    for(const container of [track,tabList]) {
        const entries=new Map([...container.children].map(node=>[node.dataset.exampleId,node]));
        container.replaceChildren(...ids.map(id=>entries.get(id)));
    }
    if(metadata) {
        for(const node of document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]')) node.content='Changed website title';
        for(const node of document.querySelectorAll('meta[property="og:description"],meta[name="twitter:description"]')) node.content='Changed description';
        for(const node of document.querySelectorAll('meta[property="og:image"],meta[property="og:image:secure_url"],meta[name="twitter:image"]')) node.content=`https://ograf.ebu.io/${metadata.image}`;
        document.querySelector('meta[property="og:image:type"]').content='image/svg+xml';
        for(const node of document.querySelectorAll('meta[property="og:image:alt"],meta[name="twitter:image:alt"]')) node.content='A blue rectangle used as a content fixture.';
        document.querySelector('meta[property="og:image:width"]').content=String(metadata.width);
        document.querySelector('meta[property="og:image:height"]').content=String(metadata.height);
        document.querySelector('.section-video__embed').dataset.videoId='A1b2C3d4E5f';
        for(const node of document.querySelectorAll('.status-card')) node.textContent='Updated publication information';
    }
}

export async function contentVariant(page,baseURL,{single=false,metadata=true,fields=false}={}) {
    const catalog=await (await page.request.get(new URL('website/demo-catalog.json',baseURL).href)).json();
    const source=catalog.examples[0];
    let id=single?'fixture-only-example':'fixture-additional-example';
    while(catalog.examples.some(example=>example.id===id)) id+='-extra';
    const extra={...structuredClone(source),id,title:'Another example with an editable title',archiveName:`${id}.zip`};
    const changed={...catalog,examples:single?[extra]:[...catalog.examples,extra].reverse()};
    const ids=changed.examples.map(example=>example.id).reverse();
    const manifest=await (await page.request.get(new URL(source.manifest,baseURL).href)).json();
    const configuration={ids,id,fields,title:extra.title,metadata:metadata&&{
        image:'website/assets/fixture-social.svg',width:1280,height:720
    }};
    await page.route('**/website/assets/fixture-social.svg',route=>route.fulfill({contentType:'image/svg+xml',
        body:'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="blue"/></svg>'}));
    await page.route('**/website/demo-catalog.json',route=>route.fulfill({json:changed}));
    await page.route(new URL('./',baseURL).href,async route=>{
        const response=await route.fetch();
        const html=(await response.text()).replace(/<script\b[^>]*\bsrc=/i,
            match=>`<script>(${applyVariant.toString()})(${JSON.stringify(configuration)})</script>${match}`);
        await route.fulfill({response,body:html});
    });
    return {ids,id,catalog:changed,source,manifest};
}
