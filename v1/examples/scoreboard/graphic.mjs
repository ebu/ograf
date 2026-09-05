/**
 * OGraf Example — Live Scoreboard
 * https://ograf.ebu.io/v1/specification/docs/Specification.html
 *
 * Steps: pre-match → live → half-time → second-half → full-time
 *
 * Layout mirrors real broadcast scoreboards:
 *   [crest] FCZ  0 : 0  AJX [crest]
 *   Single horizontal row — compact, always readable.
 */

const MATCH_PHASES = Object.freeze([
    'pre-match',
    'live',
    'half-time',
    'second-half',
    'full-time'
]);
const MATCH_PHASE_START_MINUTES = Object.freeze([0, 0, 45, 45, 90]);
const SCORE_FLASH_DURATION_MS = 600;
const STEP_TRANSITION_DURATION_MS = 400;
const PLAY_TRANSITION_DURATION_MS = 600;
const STOP_TRANSITION_DURATION_MS = 400;
const MAX_MATCH_MINUTE = 90;

const DEFAULT_STATE = Object.freeze({
    homeShort: 'FCZ',
    awayShort: 'AJX',
    homeScore: 0,
    awayScore: 0,
    minute: 0,
    seconds: 0,
    homeColor: '#005ca9',
    awayColor: '#d4192c'
});

function resolveTargetStep(currentStep, { goto, delta } = {}) {
    const requestedStep = Number.isInteger(goto) && goto >= 0
        ? goto
        : (currentStep ?? -1) + (Number.isInteger(delta) ? delta : 1);

    if (requestedStep < 0) return 0;
    if (requestedStep >= MATCH_PHASES.length) return undefined;

    return requestedStep;
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

  @keyframes fadeScale {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }

  @keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.9); }
  }

  @keyframes pulseLive {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }

  @keyframes scoreFlash {
    0%   { transform: scale(1); color: #fff; }
    25%  { transform: scale(1.35); color: #fbbf24; }
    100% { transform: scale(1); color: #fff; }
  }

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes tickClock {
    from { opacity: 0.4; }
    to   { opacity: 1; }
  }

  /* ── Root container ──────────────────────────────── */

  .sb {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: clamp(12px, 3vmin, 36px);
    font-family: 'Inter', 'Arial', 'Helvetica Neue', sans-serif;
    opacity: 0;
  }

  .sb.is-visible {
    opacity: 1;
  }

  .sb.is-entering {
    animation: fadeScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .sb.is-exiting {
    animation: fadeOut 0.35s ease-in both;
  }

  /* ── Board ──────────────────────────────────────── */

  .sb__board {
    position: relative;
    background: linear-gradient(145deg, rgba(12,16,32,0.97) 0%, rgba(18,22,42,0.97) 100%);
    border-radius: clamp(6px, 1.2vmin, 14px);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow:
      0 4px 40px rgba(0,0,0,0.55),
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 1px 0 rgba(255,255,255,0.06) inset;
    overflow: hidden;
  }

  /* Top shimmer bar */
  .sb__shimmer {
    height: clamp(2px, 0.35vmin, 3px);
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99,132,255,0.5) 25%,
      rgba(255,255,255,0.7) 50%,
      rgba(99,132,255,0.5) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 20s linear infinite;
  }

  /* ── Header: status only, centered ───────────────── */

  .sb__header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: clamp(4px, 0.8vmin, 10px) clamp(10px, 2vmin, 24px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .sb__status {
    display: flex;
    align-items: center;
    gap: clamp(3px, 0.6vmin, 7px);
  }

  .sb__status-dot {
    width: clamp(4px, 0.7vmin, 7px);
    height: clamp(4px, 0.7vmin, 7px);
    border-radius: 50%;
    background: #888;
    flex-shrink: 0;
  }

  .sb__status-label {
    font-size: clamp(7px, 1.1vmin, 11px);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
  }

  /* ── Clock — sits between the two scores ─────────── */

  .sb__clock {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(1px, 0.2vmin, 3px);
  }

  .sb__clock-time {
    font-size: clamp(10px, 2vmin, 20px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: rgba(255,255,255,0.55);
    letter-spacing: 0.06em;
    line-height: 1;
  }

  .sb__clock-sep {
    display: inline;
    margin: 0 1px;
  }

  .sb__clock-tick {
    animation: tickClock 1s steps(1) infinite;
  }

  /* Divider — only visible in pre-match */
  .sb__divider {
    font-size: clamp(14px, 3vmin, 30px);
    font-weight: 300;
    color: rgba(255,255,255,0.2);
    line-height: 1;
  }

  /* ── Footer ─────────────────────────────────────── */

  .sb__footer {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: clamp(3px, 0.6vmin, 6px);
    padding: clamp(3px, 0.6vmin, 8px) clamp(10px, 2vmin, 24px);
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: clamp(6px, 0.9vmin, 9px);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sb__footer-label {
    color: rgba(255,255,255,0.2);
  }

  .sb__footer-brand {
    color: #87a0de;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .sb[data-step="pre-match"] .sb__clock { display: none; }

  /* Step-specific clock colours */
  .sb[data-step="live"] .sb__clock-time,
  .sb[data-step="second-half"] .sb__clock-time { color: #ef4444; }
  .sb[data-step="half-time"] .sb__clock-time   { color: #f59e0b; }

  /* Step-specific status styling */
  .sb[data-step="live"] .sb__status-label,
  .sb[data-step="second-half"] .sb__status-label { color: #ef4444; }
  .sb[data-step="live"] .sb__status-dot,
  .sb[data-step="second-half"] .sb__status-dot {
    background: #ef4444;
    animation: pulseLive 1.4s ease-in-out infinite;
  }
  .sb[data-step="half-time"] .sb__status-label { color: #f59e0b; }
  .sb[data-step="half-time"] .sb__status-dot   { background: #f59e0b; }
  .sb[data-step="full-time"] .sb__status-label { color: rgba(255,255,255,0.5); }
  .sb[data-step="full-time"] .sb__status-dot   { background: #22c55e; }

  /* ── Main score row — single horizontal line ─────── */

  .sb__main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(4px, 0.9vmin, 11px) clamp(10px, 2vmin, 24px);
    gap: clamp(8px, 1.6vmin, 20px);
  }

  /* ── Team side (crest + short code) ──────────────── */

  .sb__team {
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.2vmin, 14px);
    flex-shrink: 0;
  }

  .sb__team--home {
    flex-direction: row;
  }

  .sb__team--away {
    flex-direction: row-reverse;
  }

  .sb__crest {
    width: clamp(22px, 4.2vmin, 44px);
    height: clamp(22px, 4.2vmin, 44px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: clamp(7px, 1.3vmin, 13px);
    color: #fff;
    letter-spacing: 0.02em;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    box-shadow:
      0 2px 8px rgba(0,0,0,0.35),
      0 0 0 2px rgba(255,255,255,0.1) inset;
    flex-shrink: 0;
  }

  .sb__team-short {
    font-size: clamp(12px, 2.8vmin, 28px);
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
  }

  /* ── Center score block ────────────────────────── */

  .sb__center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(3px, 0.6vmin, 7px);
    flex-shrink: 0;
  }

  .sb__scores {
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.2vmin, 14px);
  }

  .sb__score {
    font-size: clamp(20px, 4.8vmin, 48px);
    font-weight: 900;
    color: #fff;
    line-height: 1;
    min-width: 1.2ch;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .sb__score.is-flashing {
    animation: scoreFlash 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .sb__divider {
    font-size: clamp(14px, 3vmin, 30px);
    font-weight: 300;
    color: rgba(255,255,255,0.2);
    line-height: 1;
  }

  /* ── Entry animations (child stagger) ───────────── */

  .sb.is-entering .sb__board  { animation: fadeScale 0.45s cubic-bezier(0.16,1,0.3,1) 0.05s backwards; }
  .sb.is-entering .sb__team   { animation: fadeScale 0.35s cubic-bezier(0.16,1,0.3,1) 0.15s backwards; }
  .sb.is-entering .sb__center { animation: fadeScale 0.35s cubic-bezier(0.16,1,0.3,1) 0.1s  backwards; }
  .sb.is-entering .sb__header { animation: fadeScale 0.3s  cubic-bezier(0.16,1,0.3,1) 0.08s backwards; }
  .sb.is-entering .sb__footer { animation: fadeScale 0.3s  cubic-bezier(0.16,1,0.3,1) 0.2s  backwards; }

  /* ── Step change animation ─────────────────────── */

  .sb__center.is-step-changing {
    animation: fadeScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .sb__status.is-step-changing {
    animation: fadeScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* ── Square / portrait: center horizontally ─────── */

  @media (max-aspect-ratio: 5/4) {
    .sb {
      justify-content: center;
    }
  }
`;

export default class OGrafScoreboard extends HTMLElement {
    constructor() {
        super();
        this._state = { ...DEFAULT_STATE };
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._shadow = this.attachShadow({ mode: 'open' });
        this._clockTimer = null;
        this._actionRevision = 0;
        this._pendingDelays = new Set();
    }

    async load({ data = {}, renderType, renderCharacteristics } = {}) {
        this._cancelPendingAction();
        this._stopClock();
        this._state = { ...DEFAULT_STATE, ...data };
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._buildDOM();
        this._updateDOM();

        return { statusCode: 200 };
    }

    async playAction(params = {}) {
        const actionRevision = this._beginAction();
        const targetStep = resolveTargetStep(this._currentStep, params);

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
        this._applyMatchPhase(previousStep, targetStep);
        this._updateDOM();

        if (!wasVisible) {
            await this._showGraphic(params.skipAnimation, actionRevision);
        } else if (previousStep !== targetStep && !params.skipAnimation) {
            await this._animateStepChange(actionRevision);
        }

        if (this._isCurrentAction(actionRevision)) this._syncClock();

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
        const previousHomeScore = this._state.homeScore;
        const previousAwayScore = this._state.awayScore;
        this._state = { ...this._state, ...data };
        this._updateDOM();

        if (!skipAnimation && this._lifecycleState === 'step') {
            const changedSides = [];
            if (this._state.homeScore !== previousHomeScore) changedSides.push('home');
            if (this._state.awayScore !== previousAwayScore) changedSides.push('away');
            await this._animateScoreChanges(changedSides, actionRevision);
        }

        return { statusCode: 200 };
    }

    async customAction({ id, skipAnimation = false } = {}) {
        const sideByActionId = {
            'goal-home': 'home',
            'goal-away': 'away'
        };
        const side = sideByActionId[id];
        if (!side) {
            return {
                statusCode: 400,
                statusMessage: `Unknown custom action: ${String(id)}`
            };
        }

        const actionRevision = this._beginAction();
        const scoreProperty = side === 'home' ? 'homeScore' : 'awayScore';
        this._state = {
            ...this._state,
            [scoreProperty]: this._state[scoreProperty] + 1
        };
        this._updateDOM();

        if (!skipAnimation && this._lifecycleState === 'step') {
            await this._animateScoreChanges([side], actionRevision);
        }

        return {
            statusCode: 200,
            result: this._stateResult()
        };
    }

    async dispose() {
        this._cancelPendingAction();
        this._stopClock();
        this._shadow.innerHTML = '';

        return { statusCode: 200 };
    }

    _beginAction() {
        this._cancelPendingAction();
        this._clearTransientClasses();
        this._updateDOM();

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

    async _showGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.sb');
        if (!graphic) return;

        graphic.classList.add('is-visible');
        if (skipAnimation) return;

        graphic.classList.add('is-entering');
        await this._wait(PLAY_TRANSITION_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            graphic.classList.remove('is-entering');
        }
    }

    async _hideGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.sb');
        this._stopClock();
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

    async _animateStepChange(actionRevision) {
        const animatedElements = [
            this._shadow.querySelector('.sb__center'),
            this._shadow.querySelector('.sb__status')
        ].filter(Boolean);
        animatedElements.forEach(element => element.classList.add('is-step-changing'));
        await this._wait(STEP_TRANSITION_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            animatedElements.forEach(element => element.classList.remove('is-step-changing'));
        }
    }

    async _animateScoreChanges(sides, actionRevision) {
        const scoreElements = sides
            .map(side => this._shadow.querySelector(`.sb__score--${side}`))
            .filter(Boolean);
        if (!scoreElements.length) return;

        scoreElements.forEach(element => element.classList.add('is-flashing'));
        await this._wait(SCORE_FLASH_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            scoreElements.forEach(element => element.classList.remove('is-flashing'));
        }
    }

    _clearTransientClasses() {
        this._shadow.querySelector('.sb')?.classList.remove('is-entering', 'is-exiting');
        this._shadow.querySelectorAll('.is-step-changing, .is-flashing')
            .forEach(element => {
                element.classList.remove('is-step-changing', 'is-flashing');
            });
    }

    _applyMatchPhase(previousStep, targetStep) {
        if (previousStep === targetStep) return;
        if (previousStep !== undefined || targetStep !== 1) {
            this._state.minute = MATCH_PHASE_START_MINUTES[targetStep];
            this._state.seconds = 0;
        }
    }

    _playResult() {
        return {
            statusCode: 200,
            currentStep: this._currentStep,
            result: this._stateResult()
        };
    }

    _stateResult() {
        return {
            ...this._state,
            step: this._currentStep === undefined
                ? null
                : MATCH_PHASES[this._currentStep]
        };
    }

    _buildDOM() {
        this._shadow.innerHTML = `
            <style>${CSS}</style>
            <div class="sb" data-step="pre-match" aria-live="polite">
                <div class="sb__board">
                    <div class="sb__shimmer" aria-hidden="true"></div>
                    <div class="sb__header">
                        <div class="sb__status">
                            <span class="sb__status-dot" aria-hidden="true"></span>
                            <span class="sb__status-label"></span>
                        </div>
                    </div>
                    <div class="sb__main">
                        <div class="sb__team sb__team--home">
                            <div class="sb__crest"></div>
                            <span class="sb__team-short sb__team-short--home"></span>
                        </div>
                        <div class="sb__center">
                            <div class="sb__scores">
                                <span class="sb__score sb__score--home"></span>
                                <span class="sb__divider">:</span>
                                <span class="sb__score sb__score--away"></span>
                            </div>
                            <div class="sb__clock">
                                <span class="sb__clock-time">
                                    <span class="sb__clock-minutes"></span>
                                    <span class="sb__clock-sep">:</span>
                                    <span class="sb__clock-seconds"></span>
                                </span>
                            </div>
                        </div>
                        <div class="sb__team sb__team--away">
                            <div class="sb__crest"></div>
                            <span class="sb__team-short sb__team-short--away"></span>
                        </div>
                    </div>
                    <div class="sb__footer" aria-hidden="true">
                        <span class="sb__footer-label">Powered by</span>
                        <span class="sb__footer-brand">OGraf</span>
                    </div>
                </div>
            </div>
        `;
    }

    _updateDOM() {
        const graphic = this._shadow.querySelector('.sb');
        if (!graphic) return;

        const step = this._currentStep ?? 0;
        const phase = MATCH_PHASES[step];
        graphic.dataset.step = phase;

        const setText = (selector, value) => {
            const element = this._shadow.querySelector(selector);
            if (element) element.textContent = String(value);
        };
        setText('.sb__team-short--home', this._state.homeShort);
        setText('.sb__team-short--away', this._state.awayShort);
        setText('.sb__score--home', this._state.homeScore);
        setText('.sb__score--away', this._state.awayScore);
        setText('.sb__status-label', this._stepLabel(phase));
        setText('.sb__clock-minutes', String(this._state.minute).padStart(2, '0'));
        setText('.sb__clock-seconds', String(this._state.seconds).padStart(2, '0'));

        const separator = this._shadow.querySelector('.sb__clock-sep');
        separator?.classList.toggle(
            'sb__clock-tick',
            phase === 'live' || phase === 'second-half'
        );

        this._updateTeam('.sb__team--home', this._state.homeShort, this._state.homeColor);
        this._updateTeam('.sb__team--away', this._state.awayShort, this._state.awayColor);
    }

    _updateTeam(selector, shortName, color) {
        const crest = this._shadow.querySelector(`${selector} .sb__crest`);
        if (!crest) return;

        crest.textContent = String(shortName);
        crest.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(color)
            ? color
            : '#4b5563';
    }

    _stepLabel(step) {
        const labels = {
            'pre-match': 'Pre-Match',
            live: 'Live',
            'half-time': 'Half-Time',
            'second-half': 'Live',
            'full-time': 'Full-Time'
        };

        return labels[step] ?? step;
    }

    _syncClock() {
        this._stopClock();
        const phase = MATCH_PHASES[this._currentStep];
        const shouldRun = this._lifecycleState === 'step'
            && (phase === 'live' || phase === 'second-half')
            && this._state.minute < MAX_MATCH_MINUTE;
        if (!shouldRun) return;

        this._clockTimer = window.setInterval(() => {
            this._state.seconds += 1;
            if (this._state.seconds >= 60) {
                this._state.seconds = 0;
                this._state.minute += 1;
            }
            if (this._state.minute >= MAX_MATCH_MINUTE) {
                this._state.minute = MAX_MATCH_MINUTE;
                this._state.seconds = 0;
                this._stopClock();
            }
            this._updateDOM();
        }, 1000);
    }

    _stopClock() {
        if (this._clockTimer === null) return;
        window.clearInterval(this._clockTimer);
        this._clockTimer = null;
    }
}
