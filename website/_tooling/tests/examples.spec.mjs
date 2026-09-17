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

const TENNIS_MANIFEST = './v1/examples/tennis-scoreboard/tennis-scoreboard.ograf.json';

function schemaDefaults(manifest) {
    return Object.fromEntries(
        Object.entries(manifest.schema?.properties ?? {}).flatMap(([key, property]) => (
            Object.hasOwn(property, 'default') ? [[key, property.default]] : []
        ))
    );
}

test('@compat tennis scoreboard follows its dynamic step model', async ({ page }) => {
    const manifestResponse = await page.request.get(TENNIS_MANIFEST);
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(manifest.stepCount).toBe(-1);

    await page.goto(TENNIS_MANIFEST);
    const result = await page.evaluate(async defaults => {
        const TennisScoreboard = (await import('./graphic.mjs')).default;
        customElements.define('test-ograf-tennis-scoreboard', TennisScoreboard);
        const graphic = document.createElement('test-ograf-tennis-scoreboard');
        document.body.append(graphic);
        await graphic.load({
            data: defaults,
            renderType: 'realtime',
            renderCharacteristics: {
                resolution: { width: 1920, height: 1080 }
            }
        });

        const read = () => {
            const text = selector => graphic.shadowRoot
                .querySelector(selector).textContent;
            const servingRow = ['a', 'b'].find(side => graphic.shadowRoot
                .querySelector(`.tb__row--${side}`).classList.contains('is-serving'));

            return {
                phase: graphic.shadowRoot.querySelector('.tb').dataset.phase,
                stage: text('.tb__stage'),
                names: [text('.tb__name--a'), text('.tb__name--b')],
                sets: [text('.tb__sets--a'), text('.tb__sets--b')],
                games: [text('.tb__games--a'), text('.tb__games--b')],
                points: [text('.tb__points--a'), text('.tb__points--b')],
                serving: servingRow ?? null,
                pressure: graphic.shadowRoot.querySelector('.tb__pressure')
                    .classList.contains('is-shown')
                    ? text('.tb__pressure-label')
                    : null
            };
        };
        const point = async id => {
            await graphic.customAction({ id, payload: null, skipAnimation: true });
        };
        const awardGame = async player => graphic.customAction({
            id: 'award-game',
            payload: { player },
            skipAnimation: true
        });

        // Step 0 is the live scoreboard for the first set.
        const firstSet = await graphic.playAction({ goto: 0, skipAnimation: true });
        const openingView = read();

        // The receiver takes the first three points of the game: 0-40 is a break point.
        await point('point-receiver');
        await point('point-receiver');
        await point('point-receiver');
        const breakPointView = read();

        // The fourth point wins the game, so the game and the serve roll over.
        await point('point-receiver');
        const brokenView = read();

        // Drive the set to 6-6 to reach the tie-break.
        const firstAward = await awardGame('a');
        for (const player of ['b', 'a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a']) {
            await awardGame(player);
        }
        const tiebreakView = read();

        // In a tie-break the points are a running count, not 0/15/30/40, and the
        // serve changes after the first point and then every two points.
        await point('point-server');
        await point('point-server');
        await point('point-server');
        const tiebreakPointsView = read();

        const missingPayload = await graphic.customAction({
            id: 'award-game',
            payload: null,
            skipAnimation: true
        });
        const unknownAction = await graphic.customAction({
            id: 'not-declared',
            payload: null,
            skipAnimation: true
        });

        await graphic.updateAction({
            data: {
                setsA: 2,
                setsB: 1,
                gamesA: 0,
                gamesB: 0,
                pointsA: 0,
                pointsB: 0,
                tiebreak: false
            },
            skipAnimation: true
        });
        const secondSet = await graphic.playAction({ delta: 1, skipAnimation: true });
        const secondSetView = read();

        // Best of three has four steps: three sets and the result.
        const resultStep = await graphic.playAction({ goto: 3, skipAnimation: true });
        const resultView = read();
        const end = await graphic.playAction({ goto: 4, skipAnimation: true });
        const isHiddenAtEnd = !graphic.shadowRoot.querySelector('.tb')
            .classList.contains('is-visible');

        // Best of five adds two set steps, so step 4 is a set and step 5 the result.
        await graphic.updateAction({ data: { bestOf: 5 }, skipAnimation: true });
        const bestOfFiveSet = await graphic.playAction({ goto: 4, skipAnimation: true });
        const bestOfFiveSetView = read();
        const bestOfFiveResult = await graphic.playAction({ goto: 5, skipAnimation: true });
        const bestOfFiveEnd = await graphic.playAction({ goto: 6, skipAnimation: true });

        await graphic.stopAction({ skipAnimation: true });
        await graphic.dispose({});

        return {
            steps: [
                firstSet.currentStep,
                secondSet.currentStep,
                resultStep.currentStep
            ],
            phases: [openingView.phase, secondSetView.phase, resultView.phase],
            openingStage: openingView.stage,
            openingNames: openingView.names,
            openingPoints: openingView.points,
            openingServing: openingView.serving,
            breakPointPoints: breakPointView.points,
            breakPointBadge: breakPointView.pressure,
            brokenGames: brokenView.games,
            brokenPoints: brokenView.points,
            brokenServing: brokenView.serving,
            firstAwardStatus: firstAward.statusCode,
            tiebreakStage: tiebreakView.stage,
            tiebreakGames: tiebreakView.games,
            tiebreakPoints: tiebreakView.points,
            tiebreakCount: tiebreakPointsView.points,
            tiebreakServing: tiebreakPointsView.serving,
            missingPayloadStatus: missingPayload.statusCode,
            unknownStatus: unknownAction.statusCode,
            secondSetStage: secondSetView.stage,
            setInPlay: secondSet.result.setInPlay,
            resultStage: resultView.stage,
            resultSets: resultView.sets,
            matchComplete: resultStep.result.matchComplete,
            matchWinner: resultStep.result.matchWinner,
            reachedEnd: end.currentStep === undefined,
            isHiddenAtEnd,
            bestOfFiveStage: bestOfFiveSetView.stage,
            bestOfFiveSteps: [
                bestOfFiveSet.currentStep,
                bestOfFiveResult.currentStep,
                bestOfFiveEnd.currentStep ?? null
            ],
            bestOfFiveResultPhase: bestOfFiveResult.result.step,
            disposed: graphic.shadowRoot.childElementCount === 0
        };
    }, schemaDefaults(manifest));

    expect(result).toEqual({
        steps: [0, 1, 3],
        phases: ['set', 'set', 'result'],
        openingStage: 'Set 1',
        openingNames: ['A. Moreau', 'J. Lindqvist'],
        openingPoints: ['0', '0'],
        openingServing: 'a',
        breakPointPoints: ['0', '40'],
        breakPointBadge: 'Break point · LIN',
        brokenGames: ['0', '1'],
        brokenPoints: ['0', '0'],
        brokenServing: 'b',
        firstAwardStatus: 200,
        tiebreakStage: 'Tie-break',
        tiebreakGames: ['6', '6'],
        tiebreakPoints: ['0', '0'],
        tiebreakCount: ['1', '2'],
        tiebreakServing: 'a',
        missingPayloadStatus: 400,
        unknownStatus: 400,
        secondSetStage: 'Set 2',
        setInPlay: 2,
        resultStage: 'A. Moreau wins',
        resultSets: ['2', '1'],
        matchComplete: true,
        matchWinner: 'a',
        reachedEnd: true,
        isHiddenAtEnd: true,
        bestOfFiveStage: 'Set 5',
        bestOfFiveSteps: [4, 5, null],
        bestOfFiveResultPhase: 'result',
        disposed: true
    });
});

test('tennis scoreboard renders from schema defaults with the network blocked', async ({ page }) => {
    const manifestResponse = await page.request.get(TENNIS_MANIFEST);
    const manifest = await manifestResponse.json();
    const defaults = schemaDefaults(manifest);

    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await page.goto(TENNIS_MANIFEST);
    await page.evaluate(async () => {
        window.__TennisScoreboard = (await import('./graphic.mjs')).default;
    });

    // From here on the Graphic gets no network at all: every request is aborted
    // and the browser context is offline.
    const blockedRequests = [];
    await page.route('**/*', async route => {
        blockedRequests.push(route.request().url());
        await route.abort();
    });
    await page.context().setOffline(true);

    const rendered = await page.evaluate(async defaultData => {
        customElements.define('offline-ograf-tennis', window.__TennisScoreboard);
        const graphic = document.createElement('offline-ograf-tennis');
        graphic.style.display = 'block';
        graphic.style.width = '1280px';
        graphic.style.height = '720px';
        document.body.append(graphic);

        const load = await graphic.load({
            data: defaultData,
            renderType: 'realtime',
            renderCharacteristics: { resolution: { width: 1280, height: 720 } }
        });
        const play = await graphic.playAction({ goto: 0, skipAnimation: true });
        await graphic.customAction({
            id: 'point-server',
            payload: null,
            skipAnimation: true
        });
        const board = graphic.shadowRoot.querySelector('.tb__board');
        const bounds = board.getBoundingClientRect();

        return {
            loadStatus: load.statusCode,
            currentStep: play.currentStep,
            isVisible: graphic.shadowRoot.querySelector('.tb')
                .classList.contains('is-visible'),
            event: graphic.shadowRoot.querySelector('.tb__event').textContent,
            stage: graphic.shadowRoot.querySelector('.tb__stage').textContent,
            names: [
                graphic.shadowRoot.querySelector('.tb__name--a').textContent,
                graphic.shadowRoot.querySelector('.tb__name--b').textContent
            ],
            codes: [
                graphic.shadowRoot.querySelector('.tb__chip--a').textContent,
                graphic.shadowRoot.querySelector('.tb__chip--b').textContent
            ],
            points: [
                graphic.shadowRoot.querySelector('.tb__points--a').textContent,
                graphic.shadowRoot.querySelector('.tb__points--b').textContent
            ],
            hasSize: bounds.width > 100 && bounds.height > 20,
            styleSheets: graphic.shadowRoot.querySelectorAll('style').length
        };
    }, defaults);

    expect(rendered).toEqual({
        loadStatus: 200,
        currentStep: 0,
        isVisible: true,
        event: 'Centre Court · Quarter-Final',
        stage: 'Set 1',
        names: ['A. Moreau', 'J. Lindqvist'],
        codes: ['MOR', 'LIN'],
        points: ['15', '0'],
        hasSize: true,
        styleSheets: 1
    });
    expect(blockedRequests, 'requests attempted while offline').toEqual([]);

    const unexpectedRequests = requests.filter(url => !url.endsWith(
        '/v1/examples/tennis-scoreboard/tennis-scoreboard.ograf.json'
    ) && !url.endsWith('/v1/examples/tennis-scoreboard/graphic.mjs')
        && !url.endsWith('/favicon.ico'));
    expect(unexpectedRequests, 'requests outside the OGraf package').toEqual([]);
});
