import { expect, test } from '@playwright/test';
import { action, expectPageFits, openLandingPage, slides, status, tabs } from './helpers/site.mjs';
import { contentVariant } from './helpers/content-variant.mjs';

for(const single of [false,true]) {
    test(`@mobile content variation: ${single?'one-demo-without-scoreboard':'add-and-reorder'}`,async({page,baseURL})=>{
        test.setTimeout(90_000);
        const {ids}=await contentVariant(page,baseURL,{single});
        const errors=await openLandingPage(page,{reducedMotion:true});
        await expect(slides(page)).toHaveCount(ids.length);
        for(let index=0;index<ids.length;index++) {
            await tabs(page).nth(index).click();
            const card=slides(page).nth(index);
            await expect(card).toHaveAttribute('data-example-id',ids[index]);
            await expect(action(card,'play')).toBeEnabled();
            await action(card,'play').click(); await expect(status(card)).toHaveAttribute('data-state','playing');
            await action(card,'stop').click(); await expect(status(card)).toHaveAttribute('data-state','ready');
        }
        await tabs(page).first().focus(); await page.keyboard.press('End'); await expect(tabs(page).last()).toBeFocused();
        await page.keyboard.press('Home'); await expect(tabs(page).first()).toBeFocused();
        if(ids.length===1) {
            await expect(page.locator('.demo-carousel__btn--prev')).toBeDisabled();
            await expect(page.locator('.demo-carousel__btn--next')).toBeDisabled();
        }
        await expectPageFits(page);
        expect(errors).toEqual([]);
    });
}
