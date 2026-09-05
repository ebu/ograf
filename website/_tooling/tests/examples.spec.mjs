import { expect, test } from '@playwright/test';

test('scoreboard follows the OGraf multi-step lifecycle', async ({ page }) => {
    await page.goto('./v1/examples/scoreboard/scoreboard.ograf.json');

    const result = await page.evaluate(async () => {
        const Scoreboard = (await import('./graphic.mjs')).default;
        customElements.define('test-ograf-scoreboard', Scoreboard);
        const graphic = document.createElement('test-ograf-scoreboard');
        document.body.append(graphic);
        await graphic.load({
            data: { homeScore: 2 },
            renderType: 'realtime',
            renderCharacteristics: {
                resolution: { width: 1920, height: 1080 }
            }
        });

        const preMatch = await graphic.playAction({ goto: 0, skipAnimation: true });
        const live = await graphic.playAction({ delta: 1, skipAnimation: true });
        const goal = await graphic.customAction({
            id: 'goal-home',
            payload: null,
            skipAnimation: true
        });
        const halfTime = await graphic.playAction({ delta: 1, skipAnimation: true });
        const secondHalf = await graphic.playAction({ goto: 3, skipAnimation: true });
        const unknownAction = await graphic.customAction({
            id: 'not-declared',
            payload: null,
            skipAnimation: true
        });

        await graphic.stopAction({ skipAnimation: true });
        const replay = await graphic.playAction({ goto: 1, skipAnimation: true });
        await graphic.stopAction({ skipAnimation: false });
        const opacityAfterStop = getComputedStyle(
            graphic.shadowRoot.querySelector('.sb')
        ).opacity;
        const end = await graphic.playAction({ goto: 5, skipAnimation: true });
        const isHiddenAtEnd = !graphic.shadowRoot.querySelector('.sb')
            .classList.contains('is-visible');
        await graphic.dispose({});

        return {
            steps: [
                preMatch.currentStep,
                live.currentStep,
                halfTime.currentStep,
                secondHalf.currentStep
            ],
            phases: [
                preMatch.result.step,
                live.result.step,
                halfTime.result.step,
                secondHalf.result.step
            ],
            goalScore: goal.result.homeScore,
            replayScore: replay.result.homeScore,
            unknownStatus: unknownAction.statusCode,
            opacityAfterStop,
            reachedEnd: end.currentStep === undefined,
            isHiddenAtEnd,
            disposed: graphic.shadowRoot.childElementCount === 0
        };
    });

    expect(result).toEqual({
        steps: [0, 1, 2, 3],
        phases: ['pre-match', 'live', 'half-time', 'second-half'],
        goalScore: 3,
        replayScore: 3,
        unknownStatus: 400,
        opacityAfterStop: '0',
        reachedEnd: true,
        isHiddenAtEnd: true,
        disposed: true
    });
});

test('responsive lower third follows the one-step lifecycle', async ({ page }) => {
    await page.goto(
        './v1/examples/responsive-lower-third/responsive-lower-third.ograf.json'
    );

    const result = await page.evaluate(async () => {
        const LowerThird = (await import('./graphic.mjs')).default;
        customElements.define('test-ograf-responsive-lower-third', LowerThird);
        const graphic = document.createElement('test-ograf-responsive-lower-third');
        graphic.style.display = 'block';
        graphic.style.width = '1080px';
        graphic.style.height = '1920px';
        document.body.append(graphic);
        await graphic.load({
            data: {},
            renderType: 'realtime',
            renderCharacteristics: {
                resolution: { width: 1080, height: 1920 }
            }
        });
        const initialLayout = graphic.dataset.layout;

        const firstPlay = await graphic.playAction({ goto: 0, skipAnimation: true });
        const animatedElements = [
            ...graphic.shadowRoot.querySelectorAll(
                '.l3rd__topline, .l3rd__name, .l3rd__tag, '
                + '.l3rd__title, .l3rd__channel'
            )
        ];
        const hasLeakingInlineStyles = animatedElements.some(element => (
            element.style.animation || element.style.opacity
        ));

        await graphic.stopAction({ skipAnimation: true });
        const playPromise = graphic.playAction({ goto: 0, skipAnimation: false });
        await new Promise(resolve => window.setTimeout(resolve, 50));
        const stopPromise = graphic.stopAction({ skipAnimation: true });
        await Promise.all([playPromise, stopPromise]);
        const hiddenAfterInterruption = !graphic.shadowRoot.querySelector('.l3rd')
            .classList.contains('is-visible');

        const replay = await graphic.playAction({ goto: 0, skipAnimation: true });
        const end = await graphic.playAction({ goto: 1, skipAnimation: true });
        await graphic.updateAction({
            data: { name: 'Updated Presenter' },
            skipAnimation: true
        });
        const updated = await graphic.playAction({ goto: 0, skipAnimation: true });

        graphic.style.width = '1600px';
        graphic.style.height = '900px';
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const finalLayout = graphic.dataset.layout;
        await graphic.dispose({});

        return {
            initialLayout,
            firstStep: firstPlay.currentStep,
            hasLeakingInlineStyles,
            hiddenAfterInterruption,
            replayStep: replay.currentStep,
            reachedEnd: end.currentStep === undefined,
            updatedName: updated.result.name,
            finalLayout,
            disposed: graphic.shadowRoot.childElementCount === 0
        };
    });

    expect(result).toEqual({
        initialLayout: 'portrait',
        firstStep: 0,
        hasLeakingInlineStyles: false,
        hiddenAfterInterruption: true,
        replayStep: 0,
        reachedEnd: true,
        updatedName: 'Updated Presenter',
        finalLayout: 'landscape',
        disposed: true
    });
});

test('single-step examples return a currentStep payload', async ({ page }) => {
    const examples = [
        {
            manifest: './v1/examples/l3rd-name/l3rd.ograf.json',
            tag: 'test-ograf-l3rd-name',
            renderType: 'realtime',
            data: { name: 'John Doe', title: 'OGraf expert' }
        },
        {
            manifest: './v1/examples/l3rd-name/l3rd.ograf.json',
            tag: 'test-ograf-l3rd-name',
            renderType: 'non-realtime',
            data: { name: 'John Doe', title: 'OGraf expert' }
        },
        {
            manifest: './v1/examples/minimal/minimal.ograf.json',
            tag: 'test-ograf-minimal',
            renderType: 'realtime',
            data: { message: 'Hello World!' }
        },
        {
            manifest: './v1/examples/ograf-logo/logo.ograf.json',
            tag: 'test-ograf-logo',
            renderType: 'realtime',
            data: {}
        }
    ];

    for (const example of examples) {
        await page.goto(example.manifest);
        const result = await page.evaluate(async ({ tag, renderType, data }) => {
            const Graphic = (await import('./graphic.mjs')).default;
            customElements.define(tag, Graphic);
            const graphic = document.createElement(tag);
            document.body.append(graphic);
            await graphic.load({
                data,
                renderType,
                renderCharacteristics: {
                    resolution: { width: 1920, height: 1080 }
                }
            });

            const firstPlay = await graphic.playAction({ goto: 0, skipAnimation: true });
            const end = await graphic.playAction({ goto: 1, skipAnimation: true });

            return {
                firstStep: firstPlay.currentStep,
                firstHasCurrentStep: Object.hasOwn(firstPlay, 'currentStep'),
                endStep: end.currentStep ?? null,
                endHasCurrentStep: Object.hasOwn(end, 'currentStep')
            };
        }, example);

        expect(result).toEqual({
            firstStep: 0,
            firstHasCurrentStep: true,
            endStep: null,
            endHasCurrentStep: true
        });
    }
});
