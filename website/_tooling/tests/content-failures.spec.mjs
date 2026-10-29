import { expect, test } from '@playwright/test';
import { action, calls, catalogue, clearCalls, expectCall, instrumentGraphic, openLandingPage, status } from './helpers/site.mjs';
import { contentVariant } from './helpers/content-variant.mjs';

// A controlled Graphic isolates data forwarding from examples' own data schemas.
// The normal integration test still exercises every real Graphic separately.
test('generic controls forward edited values with their declared types', async ({page,baseURL})=>{
    const {id,source,manifest}=await contentVariant(page,baseURL,{single:true,metadata:false,fields:true});
    const moduleUrl=new URL(manifest.main,new URL(source.manifest,baseURL));
    await page.route(moduleUrl.href,route=>route.fulfill({contentType:'text/javascript',body:`
        export default class extends HTMLElement {
            async load() { this.textContent='Controlled graphic'; }
            async playAction() { return {currentStep:0}; }
            async updateAction() {}
            async customAction() { return {}; }
            async stopAction() {}
            async dispose() { this.replaceChildren(); }
        }`}));
    const errors=await openLandingPage(page,{reducedMotion:true});
    await page.locator(`.demo-carousel__dot[data-example-id="${id}"]`).click();
    const card=page.locator(`.demo-carousel__slide[data-example-id="${id}"]`);
    await instrumentGraphic(card);
    await action(card,'play').click(); await expect(status(card)).toHaveAttribute('data-state','playing');
    await clearCalls(card);
    const field=card.locator('input[data-demo-field]').first();
    await field.fill('Edited content');
    await card.locator('input[data-demo-value-type="number"]').fill('7');
    await action(card,'update').click(); await expectCall(card,'updateAction');
    const data=(await calls(card)).find(call=>call.name==='updateAction').args[0].data;
    expect(data[await field.getAttribute('data-demo-field')]).toBe('Edited content');
    expect(data.fixtureNumber).toBe(7);
    expect(errors).toEqual([]);
});

test('a mismatching download hash blocks the ZIP and reports the failure',async({page})=>{
    const errors=await openLandingPage(page,{reducedMotion:true});
    const catalog=await catalogue(page);
    const example=catalog.examples[0], file=example.files[0];
    await page.route(url=>url.pathname.endsWith(`/${file.source}`) && url.searchParams.has('v'),
        route=>route.fulfill({contentType:'application/octet-stream',body:'Changed bytes'}));
    let downloaded=false;
    page.on('download',()=>{downloaded=true;});
    await page.locator(`.demo-carousel__dot[data-example-id="${example.id}"]`).click();
    const link=page.locator(`.demo-carousel__slide[data-example-id="${example.id}"] [data-example-download]`);
    await link.click();
    await expect(page.locator('.sr-only[role="status"][aria-live="polite"]')).toContainText('could not be prepared');
    await expect(link).not.toHaveAttribute('aria-busy');
    expect(downloaded).toBe(false);
    await expect.poll(()=>errors.some(error=>error.includes('Integrity check failed'))).toBe(true);
    expect(errors.filter(error=>!error.includes('Integrity check failed'))).toEqual([]);
});
