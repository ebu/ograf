/**
 * OGraf Example — Tennis Scoreboard
 * https://ograf.ebu.io/v1/specification/docs/Specification.html
 *
 * Steps: one per set, then the result. A best-of-three match has four steps and
 * a best-of-five match has six, so the step count depends on the data and the
 * manifest declares `stepCount: -1` (dynamic).
 *
 * Step 0 is the live scoreboard for the first set, which is what a renderer
 * shows when it simply plays the Graphic.
 *
 * Layout mirrors a broadcast tennis bug — one row per player, columns aligned:
 *   ● [MOR] A. Moreau      1 │ 4 │ 40
 *     [LIN] J. Lindqvist   0 │ 3 │ 30
 *
 * The Graphic renders entirely from the `data` passed to load() and the defaults
 * in the manifest schema. It performs no network access of any kind.
 */

const ESTABLISHING_STEP = 0;
const POINT_LABELS = Object.freeze(['0', '15', '30', '40']);
const TIEBREAK_TARGET = 7;
const GAME_TARGET = 4;
const SET_TARGET = 6;
const TIEBREAK_SET_GAMES = 7;

const ESTABLISHING_TRANSITION_DURATION_MS = 620;
const STEP_TRANSITION_DURATION_MS = 400;
const STOP_TRANSITION_DURATION_MS = 380;
const UPDATE_FLASH_DURATION_MS = 500;
const POINT_FLASH_DURATION_MS = 500;
const GAME_FLASH_DURATION_MS = 600;
const SET_FLASH_DURATION_MS = 700;

const NUMBER_FIELDS = Object.freeze([
    'bestOf',
    'setsA',
    'setsB',
    'gamesA',
    'gamesB',
    'pointsA',
    'pointsB'
]);
const BOOLEAN_FIELDS = Object.freeze(['playerAServing', 'tiebreak']);

const DEFAULT_STATE = Object.freeze({
    eventLabel: 'Centre Court · Quarter-Final',
    bestOf: 3,
    playerAName: 'A. Moreau',
    playerBName: 'J. Lindqvist',
    playerAShort: 'MOR',
    playerBShort: 'LIN',
    playerAColor: '#1d4ed8',
    playerBColor: '#b91c1c',
    setsA: 0,
    setsB: 0,
    gamesA: 0,
    gamesB: 0,
    pointsA: 0,
    pointsB: 0,
    playerAServing: true,
    tiebreak: false
});

/** Tennis rules — kept as pure functions so the scoring stays inspectable. */

export function setsToWin(bestOf) {
    return Math.floor(bestOf / 2) + 1;
}

export function pointLabel(own, other, tiebreak) {
    if (tiebreak) return String(own);
    if (own >= 3 && other >= 3) {
        if (own === other + 1) return 'AD';

        return '40';
    }

    return POINT_LABELS[Math.min(Math.max(own, 0), 3)];
}

export function gameWonBy(pointsA, pointsB, tiebreak) {
    const target = tiebreak ? TIEBREAK_TARGET : GAME_TARGET;
    if (pointsA >= target && pointsA - pointsB >= 2) return 'a';
    if (pointsB >= target && pointsB - pointsA >= 2) return 'b';

    return null;
}

export function setWonBy(gamesA, gamesB) {
    if (gamesA >= SET_TARGET && gamesA - gamesB >= 2) return 'a';
    if (gamesB >= SET_TARGET && gamesB - gamesA >= 2) return 'b';
    if (gamesA === TIEBREAK_SET_GAMES && gamesB >= SET_TARGET - 1) return 'a';
    if (gamesB === TIEBREAK_SET_GAMES && gamesA >= SET_TARGET - 1) return 'b';

    return null;
}

function otherSide(side) {
    return side === 'a' ? 'b' : 'a';
}

function firstTiebreakServerIsA(state) {
    // The first player serves at 0, 3, 4, 7, 8, ... points played. A snapshot
    // supplies the current server, so undo the completed service changes.
    const switched = state.tiebreak
        && Math.floor((state.pointsA + state.pointsB + 1) / 2) % 2 === 1;

    return switched ? !state.playerAServing : state.playerAServing;
}

function toInteger(value, fallback) {
    const parsed = Math.trunc(Number(value));

    return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
        if (['false', '0', 'no', ''].includes(value.toLowerCase())) return false;
    }

    return fallback;
}

/**
 * Controllers frequently deliver form values, so numeric and boolean fields are
 * normalised before the scoring rules use them.
 */
function normalizeState(state) {
    const normalized = { ...state };
    for (const field of NUMBER_FIELDS) {
        normalized[field] = Math.max(0, toInteger(normalized[field], DEFAULT_STATE[field]));
    }
    for (const field of BOOLEAN_FIELDS) {
        normalized[field] = toBoolean(normalized[field], DEFAULT_STATE[field]);
    }
    if (normalized.bestOf !== 5) normalized.bestOf = 3;

    return normalized;
}

const CSS = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    container-type: inline-size;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Keyframes ─────────────────────────────────── */

  @keyframes fadeSlide {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-10px); }
  }

  @keyframes pulseServe {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.35; transform: scale(0.82); }
  }

  @keyframes cellFlash {
    0%   { transform: scale(1); color: #fff; }
    30%  { transform: scale(1.3); color: #fbbf24; }
    100% { transform: scale(1); color: #fff; }
  }

  @keyframes pressureIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Root container ──────────────────────────────── */

  .tb {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: clamp(12px, 3vmin, 36px);
    font-family: 'Inter', 'Arial', 'Helvetica Neue', sans-serif;
    opacity: 0;
    --enter-duration: ${STEP_TRANSITION_DURATION_MS}ms;
    --col-sets: 1.7ch;
    --col-games: 1.7ch;
    --col-points: 2.7ch;
  }

  .tb[data-establishing="true"] {
    --enter-duration: ${ESTABLISHING_TRANSITION_DURATION_MS}ms;
  }

  .tb.is-visible { opacity: 1; }

  .tb.is-entering {
    animation: fadeSlide var(--enter-duration) cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .tb.is-exiting {
    animation: fadeOut ${STOP_TRANSITION_DURATION_MS}ms ease-in both;
  }

  /* ── Board ──────────────────────────────────────── */

  .tb__board {
    position: relative;
    min-width: clamp(200px, 40cqi, 620px);
    background: linear-gradient(145deg, rgba(10,14,28,0.97) 0%, rgba(16,21,40,0.97) 100%);
    border-radius: clamp(5px, 1vmin, 12px);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow:
      0 4px 40px rgba(0,0,0,0.55),
      0 0 0 1px rgba(255,255,255,0.04) inset;
    overflow: hidden;
  }

  .tb__accent {
    height: clamp(2px, 0.35vmin, 3px);
    background: linear-gradient(90deg, var(--accent-a, #1d4ed8) 0%, var(--accent-b, #b91c1c) 100%);
  }

  /* ── Header: event label and stage ───────────────── */

  .tb__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: clamp(6px, 1.4vmin, 16px);
    padding: clamp(5px, 1vmin, 12px) clamp(9px, 1.8vmin, 22px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .tb__event {
    font-size: clamp(7px, 1.35vmin, 13px);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tb__stage {
    font-size: clamp(7px, 1.35vmin, 13px);
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #87a0de;
    white-space: nowrap;
  }

  .tb[data-phase="set"][data-tiebreak="true"] .tb__stage { color: #fbbf24; }
  .tb[data-phase="result"] .tb__stage { color: #22c55e; }

  /* ── Player rows ─────────────────────────────────── */

  .tb__rows {
    display: flex;
    flex-direction: column;
  }

  .tb__row {
    display: grid;
    grid-template-columns:
      clamp(9px, 1.6vmin, 16px)
      auto
      minmax(0, 1fr)
      var(--col-sets)
      var(--col-games)
      var(--col-points);
    align-items: center;
    gap: clamp(5px, 1.15vmin, 13px);
    padding: clamp(4px, 0.95vmin, 12px) clamp(9px, 1.8vmin, 22px);
  }

  .tb__row + .tb__row {
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .tb__serve {
    width: clamp(5px, 0.95vmin, 9px);
    height: clamp(5px, 0.95vmin, 9px);
    border-radius: 50%;
    background: transparent;
    justify-self: center;
  }

  .tb__row.is-serving .tb__serve {
    background: #fbbf24;
    animation: pulseServe 1.6s ease-in-out infinite;
  }

  .tb__chip {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: clamp(24px, 4.2vmin, 44px);
    padding: clamp(1px, 0.35vmin, 4px) clamp(3px, 0.6vmin, 7px);
    border-radius: clamp(2px, 0.4vmin, 4px);
    font-size: clamp(7px, 1.5vmin, 14px);
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.45);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12) inset;
  }

  .tb__name {
    font-size: clamp(10px, 2.6vmin, 25px);
    font-weight: 700;
    color: rgba(255,255,255,0.92);
    letter-spacing: 0.01em;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tb__sets,
  .tb__games,
  .tb__points {
    font-variant-numeric: tabular-nums;
    text-align: center;
    line-height: 1;
    color: #fff;
  }

  .tb__sets {
    font-size: clamp(10px, 2.4vmin, 23px);
    font-weight: 700;
    color: rgba(255,255,255,0.55);
  }

  .tb__games {
    font-size: clamp(11px, 2.8vmin, 27px);
    font-weight: 800;
  }

  .tb__points {
    font-size: clamp(12px, 3.1vmin, 30px);
    font-weight: 900;
  }

  .tb[data-tiebreak="true"] .tb__points { color: #fbbf24; }

  .tb__row.is-winner .tb__name { color: #fff; }
  .tb__row.is-winner .tb__sets { color: #22c55e; }

  .is-flashing {
    animation: cellFlash 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* ── Pressure badge (break point / set point) ────── */

  .tb__pressure {
    display: none;
    align-items: center;
    justify-content: center;
    gap: clamp(3px, 0.6vmin, 6px);
    padding: clamp(3px, 0.65vmin, 8px) clamp(9px, 1.8vmin, 22px);
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(251,191,36,0.1);
  }

  .tb__pressure.is-shown {
    display: flex;
  }

  .tb__pressure.is-animated {
    animation: pressureIn 0.3s ease-out both;
  }

  .tb__pressure-label {
    font-size: clamp(7px, 1.25vmin, 12px);
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #fbbf24;
  }

  /* ── Phase visibility ────────────────────────────── */

  .tb[data-phase="result"] .tb__games,
  .tb[data-phase="result"] .tb__points,
  .tb[data-phase="result"] .tb__serve {
    visibility: hidden;
  }

  .tb__board.is-phase-changing {
    animation: fadeSlide var(--enter-duration) cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* ── Square / portrait: centre horizontally ──────── */

  @media (max-aspect-ratio: 5/4) {
    .tb { justify-content: center; }
  }
`;

export default class OGrafTennisScoreboard extends HTMLElement {
    constructor() {
        super();
        this._state = { ...DEFAULT_STATE };
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._shadow = this.attachShadow({ mode: 'open' });
        this._actionRevision = 0;
        this._pendingDelays = new Set();
        this._tiebreakStartServerIsA = true;
    }

    /**
     * `renderType` and `renderCharacteristics` are part of the interface but this
     * Graphic needs neither: the layout adapts through container queries, and the
     * score arrives entirely in `data`.
     */
    async load({ data = {}, renderType, renderCharacteristics } = {}) {
        this._cancelPendingAction();
        this._state = normalizeState({ ...DEFAULT_STATE, ...data });
        this._tiebreakStartServerIsA = firstTiebreakServerIsA(this._state);
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._buildDOM();
        this._updateDOM(true);

        return { statusCode: 200 };
    }

    async playAction(params = {}) {
        const actionRevision = this._beginAction();
        const targetStep = this._resolveTargetStep(params);

        if (targetStep === undefined) {
            await this._hideGraphic(params.skipAnimation, actionRevision);
            if (this._isCurrentAction(actionRevision)) {
                this._currentStep = undefined;
                this._lifecycleState = 'end';
            }

            return this._playResult();
        }

        const previousStep = this._currentStep;
        const wasVisible = this._lifecycleState === 'step';
        this._currentStep = targetStep;
        this._lifecycleState = 'step';
        this._updateDOM(params.skipAnimation);

        if (!wasVisible) {
            await this._showGraphic(params.skipAnimation, actionRevision);
        } else if (previousStep !== targetStep && !params.skipAnimation) {
            await this._animatePhaseChange(actionRevision);
        }

        return this._playResult();
    }

    async stopAction({ skipAnimation = false } = {}) {
        const actionRevision = this._beginAction();
        await this._hideGraphic(skipAnimation, actionRevision);

        if (this._isCurrentAction(actionRevision)) {
            this._currentStep = undefined;
            this._lifecycleState = 'end';
        }

        return { statusCode: 200 };
    }

    async updateAction({ data = {}, skipAnimation = false } = {}) {
        const actionRevision = this._beginAction();
        const previousState = this._state;
        this._state = normalizeState({ ...this._state, ...data });
        if (this._state.tiebreak) {
            this._tiebreakStartServerIsA = firstTiebreakServerIsA(this._state);
        }
        if (this._currentStep !== undefined) {
            this._currentStep = Math.min(this._currentStep, this._stepCount() - 1);
        }
        this._updateDOM(skipAnimation);

        if (!skipAnimation && this._lifecycleState === 'step') {
            await this._animateCells(
                this._changedScoreCells(previousState),
                UPDATE_FLASH_DURATION_MS,
                actionRevision
            );
        }

        return { statusCode: 200, result: this._stateResult() };
    }

    async customAction({ id, payload, skipAnimation = false } = {}) {
        const previousState = this._state;
        let flashDuration = POINT_FLASH_DURATION_MS;

        if (id === 'point-server' || id === 'point-receiver') {
            const serving = this._state.playerAServing ? 'a' : 'b';
            this._awardPoint(id === 'point-server' ? serving : otherSide(serving));
        } else if (id === 'award-game' || id === 'award-set') {
            const side = this._resolveSide(payload);
            if (!side) {
                return {
                    statusCode: 400,
                    statusMessage: `${id} requires a payload with player "a" or "b"`
                };
            }
            flashDuration = id === 'award-game'
                ? GAME_FLASH_DURATION_MS
                : SET_FLASH_DURATION_MS;
            if (id === 'award-game') this._awardGame(side);
            else this._awardSet(side);
        } else {
            return {
                statusCode: 400,
                statusMessage: `Unknown custom action: ${String(id)}`
            };
        }

        const actionRevision = this._beginAction();
        this._updateDOM(skipAnimation);

        if (!skipAnimation && this._lifecycleState === 'step') {
            await this._animateCells(
                this._changedScoreCells(previousState),
                flashDuration,
                actionRevision
            );
        }

        return { statusCode: 200, result: this._stateResult() };
    }

    async dispose() {
        this._cancelPendingAction();
        this._shadow.innerHTML = '';

        return { statusCode: 200 };
    }

    /* ── Step model ──────────────────────────────────── */

    /**
     * The step model is dynamic: steps 0..bestOf-1 each present one set of the
     * match and the last step presents the result, so a best-of-three match has
     * four steps and a best-of-five match has six. A target step at or beyond
     * that count transitions the Graphic to its end state.
     */
    _stepCount() {
        return this._state.bestOf + 1;
    }

    _resolveTargetStep({ goto, delta } = {}) {
        const requestedStep = Number.isInteger(goto) && goto >= 0
            ? goto
            : (this._currentStep ?? -1) + (Number.isInteger(delta) ? delta : 1);

        if (requestedStep < 0) return 0;
        if (requestedStep >= this._stepCount()) return undefined;

        return requestedStep;
    }

    _phaseForStep(step) {
        if (step !== undefined && step >= this._stepCount() - 1) return 'result';

        return 'set';
    }

    /**
     * The duration depends only on the target step, which is what
     * `actionDurations` declares: step 0 establishes the board, later steps are
     * quicker transitions between sets and the result.
     */
    _transitionDuration(step) {
        return step === ESTABLISHING_STEP
            ? ESTABLISHING_TRANSITION_DURATION_MS
            : STEP_TRANSITION_DURATION_MS;
    }

    /* ── Scoring ─────────────────────────────────────── */

    _awardPoint(side) {
        const pointsKey = side === 'a' ? 'pointsA' : 'pointsB';
        this._state = { ...this._state, [pointsKey]: this._state[pointsKey] + 1 };

        if (this._state.tiebreak && (this._state.pointsA + this._state.pointsB) % 2 === 1) {
            this._state = { ...this._state, playerAServing: !this._state.playerAServing };
        }

        const gameWinner = gameWonBy(
            this._state.pointsA,
            this._state.pointsB,
            this._state.tiebreak
        );
        if (gameWinner) this._awardGame(gameWinner);
    }

    _awardGame(side) {
        const gamesKey = side === 'a' ? 'gamesA' : 'gamesB';
        const wasTiebreak = this._state.tiebreak;
        this._state = {
            ...this._state,
            [gamesKey]: this._state[gamesKey] + 1,
            pointsA: 0,
            pointsB: 0,
            tiebreak: false,
            // The serve alternates every game. A tie-break is one game, and the
            // player who received its first point serves first in the next set.
            playerAServing: wasTiebreak
                ? !this._tiebreakStartServerIsA
                : !this._state.playerAServing
        };

        const setWinner = setWonBy(this._state.gamesA, this._state.gamesB);
        if (setWinner) {
            this._awardSet(setWinner);
            return;
        }

        if (this._state.gamesA === SET_TARGET && this._state.gamesB === SET_TARGET) {
            this._state = { ...this._state, tiebreak: true };
            this._tiebreakStartServerIsA = this._state.playerAServing;
        }
    }

    _awardSet(side) {
        const setsKey = side === 'a' ? 'setsA' : 'setsB';
        this._state = {
            ...this._state,
            [setsKey]: this._state[setsKey] + 1,
            gamesA: 0,
            gamesB: 0,
            pointsA: 0,
            pointsB: 0,
            tiebreak: false
        };
    }

    _resolveSide(payload) {
        const player = typeof payload === 'string' ? payload : payload?.player;
        if (typeof player !== 'string') return null;
        const normalized = player.trim().toLowerCase();

        return normalized === 'a' || normalized === 'b' ? normalized : null;
    }

    _matchWinner() {
        const target = setsToWin(this._state.bestOf);
        if (this._state.setsA >= target) return 'a';
        if (this._state.setsB >= target) return 'b';

        return null;
    }

    _pressure() {
        const { pointsA, pointsB, tiebreak, playerAServing } = this._state;

        if (tiebreak) {
            if (pointsA >= TIEBREAK_TARGET - 1 && pointsA > pointsB) {
                return { label: 'Set point', side: 'a' };
            }
            if (pointsB >= TIEBREAK_TARGET - 1 && pointsB > pointsA) {
                return { label: 'Set point', side: 'b' };
            }

            return null;
        }

        const receivingSide = playerAServing ? 'b' : 'a';
        const receiverPoints = playerAServing ? pointsB : pointsA;
        const serverPoints = playerAServing ? pointsA : pointsB;
        if (receiverPoints >= 3 && receiverPoints > serverPoints) {
            return { label: 'Break point', side: receivingSide };
        }

        return null;
    }

    /* ── Action bookkeeping ──────────────────────────── */

    _beginAction() {
        this._cancelPendingAction();
        this._clearTransientClasses();

        return this._actionRevision;
    }

    _cancelPendingAction() {
        this._actionRevision += 1;
        for (const pendingDelay of this._pendingDelays) {
            window.clearTimeout(pendingDelay.timer);
            pendingDelay.resolve(false);
        }
        this._pendingDelays.clear();
    }

    _isCurrentAction(actionRevision) {
        return actionRevision === this._actionRevision;
    }

    _wait(duration, actionRevision) {
        return new Promise(resolve => {
            const pendingDelay = {
                timer: window.setTimeout(() => {
                    this._pendingDelays.delete(pendingDelay);
                    resolve(this._isCurrentAction(actionRevision));
                }, duration),
                resolve
            };
            this._pendingDelays.add(pendingDelay);
        });
    }

    /* ── Animation ───────────────────────────────────── */

    async _showGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.tb');
        if (!graphic) return;

        graphic.classList.add('is-visible');
        if (skipAnimation) return;

        graphic.classList.add('is-entering');
        await this._wait(this._transitionDuration(this._currentStep), actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            graphic.classList.remove('is-entering');
        }
    }

    async _hideGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.tb');
        if (!graphic) return;

        if (skipAnimation || !graphic.classList.contains('is-visible')) {
            graphic.classList.remove('is-visible', 'is-entering', 'is-exiting');
            return;
        }

        graphic.classList.add('is-exiting');
        await this._wait(STOP_TRANSITION_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            graphic.classList.remove('is-visible', 'is-exiting');
        }
    }

    async _animatePhaseChange(actionRevision) {
        const board = this._shadow.querySelector('.tb__board');
        if (!board) return;

        board.classList.add('is-phase-changing');
        await this._wait(this._transitionDuration(this._currentStep), actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            board.classList.remove('is-phase-changing');
        }
    }

    async _animateCells(selectors, duration, actionRevision) {
        const cells = selectors
            .map(selector => this._shadow.querySelector(selector))
            .filter(Boolean);
        if (!cells.length) return;

        cells.forEach(cell => cell.classList.add('is-flashing'));
        await this._wait(duration, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            cells.forEach(cell => cell.classList.remove('is-flashing'));
        }
    }

    _changedScoreCells(previousState) {
        const cells = [];
        for (const [field, selector] of [
            ['setsA', '.tb__sets--a'],
            ['setsB', '.tb__sets--b'],
            ['gamesA', '.tb__games--a'],
            ['gamesB', '.tb__games--b'],
            ['pointsA', '.tb__points--a'],
            ['pointsB', '.tb__points--b']
        ]) {
            if (previousState[field] !== this._state[field]) cells.push(selector);
        }

        return cells;
    }

    _clearTransientClasses() {
        this._shadow.querySelector('.tb')
            ?.classList.remove('is-entering', 'is-exiting');
        this._shadow.querySelector('.tb__board')
            ?.classList.remove('is-phase-changing');
        this._shadow.querySelectorAll('.is-flashing')
            .forEach(cell => cell.classList.remove('is-flashing'));
        this._shadow.querySelector('.tb__pressure')
            ?.classList.remove('is-animated');
    }

    /* ── Results ─────────────────────────────────────── */

    _playResult() {
        return {
            statusCode: 200,
            currentStep: this._currentStep,
            result: this._stateResult()
        };
    }

    _stateResult() {
        const phase = this._phaseForStep(this._currentStep);

        return {
            ...this._state,
            currentStep: this._currentStep ?? null,
            stepCount: this._stepCount(),
            step: this._currentStep === undefined ? null : phase,
            setInPlay: phase === 'set' && this._currentStep !== undefined
                ? this._currentStep + 1
                : null,
            matchWinner: this._matchWinner(),
            matchComplete: this._matchWinner() !== null
        };
    }

    /* ── Rendering ───────────────────────────────────── */

    _buildDOM() {
        this._shadow.innerHTML = `
            <style>${CSS}</style>
            <div class="tb" data-phase="set" data-establishing="true"
                 data-tiebreak="false" aria-live="polite">
                <div class="tb__board">
                    <div class="tb__accent" aria-hidden="true"></div>
                    <div class="tb__header">
                        <span class="tb__event"></span>
                        <span class="tb__stage"></span>
                    </div>
                    <div class="tb__rows">
                        <div class="tb__row tb__row--a">
                            <span class="tb__serve" aria-hidden="true"></span>
                            <span class="tb__chip tb__chip--a"></span>
                            <span class="tb__name tb__name--a"></span>
                            <span class="tb__sets tb__sets--a"></span>
                            <span class="tb__games tb__games--a"></span>
                            <span class="tb__points tb__points--a"></span>
                        </div>
                        <div class="tb__row tb__row--b">
                            <span class="tb__serve" aria-hidden="true"></span>
                            <span class="tb__chip tb__chip--b"></span>
                            <span class="tb__name tb__name--b"></span>
                            <span class="tb__sets tb__sets--b"></span>
                            <span class="tb__games tb__games--b"></span>
                            <span class="tb__points tb__points--b"></span>
                        </div>
                    </div>
                    <div class="tb__pressure">
                        <span class="tb__pressure-label"></span>
                    </div>
                </div>
            </div>
        `;
    }

    _updateDOM(skipAnimation = false) {
        const graphic = this._shadow.querySelector('.tb');
        if (!graphic) return;

        const state = this._state;
        const phase = this._phaseForStep(this._currentStep);
        const winner = this._matchWinner();
        graphic.dataset.phase = phase;
        graphic.dataset.establishing = String(this._currentStep === ESTABLISHING_STEP);
        graphic.dataset.tiebreak = String(phase === 'set' && state.tiebreak);
        graphic.style.setProperty('--accent-a', this._safeColor(state.playerAColor));
        graphic.style.setProperty('--accent-b', this._safeColor(state.playerBColor));

        this._setText('.tb__event', state.eventLabel);
        this._setText('.tb__stage', this._stageLabel(phase, winner));
        this._setText('.tb__name--a', state.playerAName);
        this._setText('.tb__name--b', state.playerBName);
        this._setText('.tb__sets--a', state.setsA);
        this._setText('.tb__sets--b', state.setsB);
        this._setText('.tb__games--a', state.gamesA);
        this._setText('.tb__games--b', state.gamesB);
        this._setText(
            '.tb__points--a',
            pointLabel(state.pointsA, state.pointsB, state.tiebreak)
        );
        this._setText(
            '.tb__points--b',
            pointLabel(state.pointsB, state.pointsA, state.tiebreak)
        );

        this._updatePlayer('a', state.playerAShort, state.playerAColor);
        this._updatePlayer('b', state.playerBShort, state.playerBColor);

        const rowA = this._shadow.querySelector('.tb__row--a');
        const rowB = this._shadow.querySelector('.tb__row--b');
        rowA?.classList.toggle('is-serving', phase === 'set' && state.playerAServing);
        rowB?.classList.toggle('is-serving', phase === 'set' && !state.playerAServing);
        rowA?.classList.toggle('is-winner', phase === 'result' && winner === 'a');
        rowB?.classList.toggle('is-winner', phase === 'result' && winner === 'b');

        this._updatePressure(phase, skipAnimation);
    }

    _updatePressure(phase, skipAnimation) {
        const pressure = this._shadow.querySelector('.tb__pressure');
        if (!pressure) return;

        const current = phase === 'set' ? this._pressure() : null;
        pressure.classList.toggle('is-shown', current !== null);
        pressure.classList.toggle('is-animated', current !== null && !skipAnimation);
        if (!current) {
            this._setText('.tb__pressure-label', '');
            return;
        }

        const code = current.side === 'a'
            ? this._state.playerAShort
            : this._state.playerBShort;
        this._setText('.tb__pressure-label', `${current.label} · ${code}`);
    }

    _stageLabel(phase, winner) {
        if (phase === 'result') {
            if (!winner) return 'Final';
            const name = winner === 'a'
                ? this._state.playerAName
                : this._state.playerBName;

            return `${name} wins`;
        }
        if (this._state.tiebreak) return 'Tie-break';

        return `Set ${(this._currentStep ?? ESTABLISHING_STEP) + 1}`;
    }

    _updatePlayer(side, shortName, color) {
        const chip = this._shadow.querySelector(`.tb__chip--${side}`);
        if (!chip) return;

        chip.textContent = String(shortName ?? '');
        chip.style.backgroundColor = this._safeColor(color);
    }

    _safeColor(color) {
        return /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : '#4b5563';
    }

    _setText(selector, value) {
        const element = this._shadow.querySelector(selector);
        if (element) element.textContent = String(value);
    }
}
