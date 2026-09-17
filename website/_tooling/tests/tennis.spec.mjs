import { expect, test } from '@playwright/test';

const MANIFEST = './v1/examples/tennis-scoreboard/tennis-scoreboard.ograf.json';

test('@compat tennis resumes tie-breaks with the correct next-set server', async ({ page }) => {
    await page.goto(MANIFEST);
    const results = await page.evaluate(async () => {
        const TennisScoreboard = (await import('./graphic.mjs')).default;
        customElements.define('test-resumed-tennis', TennisScoreboard);
        const graphic = document.createElement('test-resumed-tennis');
        document.body.append(graphic);
        const results = [];
        const servers = [true, false, false, true, true, false, false];

        for (const firstServerIsA of [true, false]) {
            for (const method of ['load', 'update']) {
                for (let pointsA = 0; pointsA < servers.length; pointsA += 1) {
                    const data = {
                        gamesA: 6, gamesB: 6, pointsA, pointsB: 0, tiebreak: true,
                        playerAServing: firstServerIsA ? servers[pointsA] : !servers[pointsA]
                    };
                    if (method === 'load') {
                        await graphic.load({ data });
                    } else {
                        // Also exercise a correction while already in a tie-break.
                        await graphic.load({ data: { gamesA: 6, gamesB: 6, tiebreak: true } });
                        await graphic.updateAction({ data, skipAnimation: true });
                    }
                    await graphic.playAction({ goto: 0, skipAnimation: true });
                    let serving = data.playerAServing;
                    let result;
                    for (let point = pointsA; point < 7; point += 1) {
                        ({ result } = await graphic.customAction({
                            id: serving ? 'point-server' : 'point-receiver',
                            skipAnimation: true
                        }));
                        serving = result.playerAServing;
                    }
                    results.push({
                        firstServerIsA, method, pointsA,
                        nextServerIsA: result.playerAServing,
                        setsA: result.setsA, gamesA: result.gamesA, tiebreak: result.tiebreak
                    });
                }
            }
        }
        await graphic.dispose();
        return results;
    });

    for (const result of results) {
        expect(result, JSON.stringify(result)).toMatchObject({
            nextServerIsA: !result.firstServerIsA,
            setsA: 1, gamesA: 0, tiebreak: false
        });
    }
});

test('@compat tennis skips the pressure-badge animation', async ({ page }) => {
    await page.goto(MANIFEST);
    const result = await page.evaluate(async () => {
        const TennisScoreboard = (await import('./graphic.mjs')).default;
        customElements.define('test-pressure-tennis', TennisScoreboard);
        const graphic = document.createElement('test-pressure-tennis');
        document.body.append(graphic);
        await graphic.load();
        await graphic.playAction({ goto: 0, skipAnimation: true });
        const pressure = graphic.shadowRoot.querySelector('.tb__pressure');
        const read = () => ({
            animation: getComputedStyle(pressure).animationName,
            opacity: getComputedStyle(pressure).opacity,
            display: getComputedStyle(pressure).display,
            text: pressure.textContent.trim()
        });
        await graphic.updateAction({ data: { pointsB: 3 }, skipAnimation: true });
        const skippedUpdate = read();
        await graphic.updateAction({ data: { pointsB: 2 }, skipAnimation: true });
        await graphic.customAction({ id: 'point-receiver', skipAnimation: true });
        const skippedPoint = read();
        await graphic.updateAction({ data: { pointsB: 2 }, skipAnimation: true });
        const animated = graphic.updateAction({ data: { pointsB: 3 } });
        const normalUpdate = read();
        // A skipping action must also cancel an animation already in progress.
        await graphic.updateAction({ data: {}, skipAnimation: true });
        const interruptedUpdate = read();
        await animated;
        await graphic.dispose();
        return { skippedUpdate, skippedPoint, normalUpdate, interruptedUpdate };
    });

    const skipped = { animation: 'none', opacity: '1', display: 'flex', text: 'Break point · LIN' };
    expect(result.skippedUpdate).toEqual(skipped);
    expect(result.skippedPoint).toEqual(skipped);
    expect(result.interruptedUpdate).toEqual(skipped);
    expect(result.normalUpdate.animation).toBe('pressureIn');
});

async function playTennis(page) {
    await page.goto('./#demo-tennis-scoreboard');
    const controller = page.locator('[data-demo-controller="tennis-scoreboard"]');
    await controller.locator('[data-demo-action="play"]').click();
    await expect(controller.locator('[data-demo-status]')).toHaveText('On Air');
    return {
        controller,
        graphic: controller.locator('iframe').contentFrame().locator('#graphic')
    };
}

test('@compat @mobile tennis form retains points after a name update', async ({ page }) => {
    const { controller, graphic } = await playTennis(page);
    const points = controller.locator('[data-demo-field="pointsA"]');
    await controller.locator('[data-demo-field="playerAName"]').fill('Updated Player');
    await controller.locator('[data-demo-custom-action="point-server"]').click();
    await expect(graphic.locator('.tb__points--a')).toHaveText('30');
    await expect(points).toHaveValue('2');
    await expect(controller.locator('[data-demo-field="playerAName"]')).toHaveValue('Updated Player');
    await controller.locator('[data-demo-action="update"]').click();
    await expect(graphic.locator('.tb__name--a')).toHaveText('Updated Player');
    await expect(graphic.locator('.tb__points--a')).toHaveText('30');
    // Rally counts above four must survive repeated deuce.
    await controller.locator('[data-demo-custom-action="point-server"]').click();
    await expect(points).toHaveValue('3');
    await controller.locator('[data-demo-custom-action="point-server"]').click();
    await expect(points).toHaveValue('4');
    await controller.locator('[data-demo-field="pointsB"]').fill('4');
    await controller.locator('[data-demo-action="update"]').click();
    await expect(graphic.locator('.tb__points--a')).toHaveText('40');
    await controller.locator('[data-demo-custom-action="point-server"]').click();
    await expect(points).toHaveValue('5');
    await expect(graphic.locator('.tb__points--a')).toHaveText('AD');
});

test('@compat @mobile tennis demo explores both match formats', async ({ page }) => {
    const { controller, graphic } = await playTennis(page);
    const next = controller.locator('[data-demo-action="next"]');
    const previous = controller.locator('[data-demo-action="previous"]');
    const format = controller.locator('[data-demo-field="bestOf"]');
    await expect(previous).toBeDisabled();
    for (const bestOf of [3, 5]) {
        if (bestOf === 5) {
            await format.selectOption('5');
            await controller.locator('[data-demo-action="update"]').click();
            await expect(graphic.locator('.tb__stage')).toHaveText('Set 4');
        }
        const first = bestOf === 3 ? 2 : 5;
        for (let set = first; set <= bestOf; set += 1) {
            await next.click();
            await expect(graphic.locator('.tb__stage')).toHaveText(`Set ${set}`);
        }
        await next.click();
        await expect(graphic.locator('.tb__stage')).toHaveText('Final');
        await expect(next).toBeDisabled();
    }
    await format.selectOption('3');
    await controller.locator('[data-demo-action="update"]').click();
    await expect(graphic.locator('.tb__stage')).toHaveText('Final');
    await previous.click();
    await expect(graphic.locator('.tb__stage')).toHaveText('Set 3');
    await controller.locator('[data-demo-action="stop"]').click();
    await expect(next).toBeDisabled();
    await expect(previous).toBeDisabled();
});
