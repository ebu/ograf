/**
 * OGraf Example — Responsive Lower Third
 * https://ograf.ebu.io/v1/specification/docs/Specification.html
 */

const PLAY_TRANSITION_DURATION_MS = 950;
const STOP_TEXT_DURATION_MS = 240;
const STOP_SLIDE_DURATION_MS = 400;
const UPDATE_OUT_DURATION_MS = 180;
const UPDATE_IN_DURATION_MS = 220;
const COMPACT_ASPECT_RATIO = 1.25;
const PORTRAIT_ASPECT_RATIO = 0.68;

const DEFAULT_STATE = Object.freeze({
    name: 'Anders Berg',
    title: 'Senior Correspondent',
    channel: 'OGraf News'
});

function resolveTargetStep(currentStep, { goto, delta } = {}) {
    const requestedStep = Number.isInteger(goto) && goto >= 0
        ? goto
        : (currentStep ?? -1) + (Number.isInteger(delta) ? delta : 1);

    return requestedStep >= 1 ? undefined : 0;
}

const CSS = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    container-type: size;
  }

  /* ── Keyframes ─────────────────────────────────── */

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(0.93cqh); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes lineGrow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }

  @keyframes livePulse {
    0%, 100% { opacity: 1;   transform: scale(1); }
    50%      { opacity: 0.3; transform: scale(0.7); }
  }

  @keyframes textOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-0.93cqh); }
  }

  @keyframes textIn {
    from { opacity: 0; transform: translateY(0.93cqh); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Root wrapper ──────────────────────────────── */

  /* Keep positioning separate from the animated inner element. */
  .l3rd-anchor {
    position: absolute;
    right: 0;
    bottom: 8%;
    left: 0;
    will-change: transform;
  }

  .l3rd {
    display: flex;
    flex-direction: column;
    width: fit-content;
    max-width: 100%;
    overflow: hidden;
    will-change: transform;
    filter: drop-shadow(0 6px 28px rgba(0, 0, 0, 0.55));
  }

  /* Allow every flex container/item along the chain from .l3rd down to
     the truncatable text to shrink below its content's min-content
     width. Without this, the default min-width:auto on each flex
     item leaks through and prevents the chain from shrinking, even
     when the outer .l3rd is capped. */
  .l3rd__body,
  .l3rd__content,
  .l3rd__name-row,
  .l3rd__title-row {
    min-width: 0;
  }

  /* Layout is derived from the component's own dimensions. */
  :host([data-layout="compact"]) .l3rd-anchor {
    bottom: 7%;
  }
  :host([data-layout="compact"]) .l3rd__name { font-size: 5.56cqh; }
  :host([data-layout="compact"]) .l3rd__title { font-size: 2.96cqh; }
  :host([data-layout="compact"]) .l3rd__name-row {
    padding: 2.96cqh 4.07cqh 2.04cqh 2.59cqh;
    gap: 5.19cqh;
  }
  :host([data-layout="compact"]) .l3rd__title-row {
    padding: 1.85cqh 4.07cqh 2.96cqh 2.59cqh;
    gap: 5.19cqh;
  }
  :host([data-layout="compact"]) .l3rd__tag-label,
  :host([data-layout="compact"]) .l3rd__channel { font-size: 1.85cqh; }

  :host([data-layout="portrait"]) .l3rd-anchor {
    bottom: 7%;
  }
  :host([data-layout="portrait"]) .l3rd__name {
    font-size: 4.07cqh;
  }
  :host([data-layout="portrait"]) .l3rd__title {
    font-size: 2.22cqh;
  }
  :host([data-layout="portrait"]) .l3rd__name-row {
    padding: 2.22cqh 2.96cqh 1.67cqh 2.04cqh;
    gap: 2.96cqh;
  }
  :host([data-layout="portrait"]) .l3rd__title-row {
    padding: 1.3cqh 2.96cqh 2.22cqh 2.04cqh;
    gap: 2.96cqh;
  }
  :host([data-layout="portrait"]) .l3rd__tag-label,
  :host([data-layout="portrait"]) .l3rd__channel {
    font-size: 1.48cqh;
  }
  :host([data-layout="portrait"]) .l3rd__divider {
    margin: 0 2.04cqh;
  }
  :host([data-layout="portrait"]) .l3rd__bar {
    width: 0.74cqh;
  }

  /* ── Top accent line ──────────────────────────── */

  .l3rd__topline {
    height: 0.56cqh;
    background: linear-gradient(90deg, #2352C3 0%, #87A0DE 60%, transparent 100%);
    transform-origin: left center;
    transform: scaleX(0);
  }

  .l3rd.is-visible .l3rd__topline {
    transform: scaleX(1);
  }

  .l3rd.is-entering .l3rd__topline {
    animation: lineGrow 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
  }

  /* ── Body (bar + content) ─────────────────────── */

  .l3rd__body {
    display: flex;
    align-items: stretch;
  }

  /* Accent bar */
  .l3rd__bar {
    width: 1.02cqh;
    background: #1a3d99;
    flex-shrink: 0;
  }

  /* Content stack */
  .l3rd__content {
    display: flex;
    flex-direction: column;
  }

  /* ── Name row ─────────────────────────────────── */

  .l3rd__name-row {
    background: rgba(7, 11, 24, 0.94);
    padding: 3.7cqh 5cqh 2.78cqh 3.06cqh;
    display: flex;
    align-items: center;
    gap: 6.67cqh;
    justify-content: space-between;
  }

  .l3rd__name {
    font-size: 6.48cqh;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.01em;
    /* line-height 1.2 gives the line-box enough vertical room for
       descenders (g, p, y...) which otherwise get clipped by the
       overflow:hidden below. Arial descender depth is ~21% of font-
       size, so anything under ~1.15 will eat the bottom of the g. */
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
    /* Hard-clip horizontally when the name is too long for its slot —
       no ellipsis, so the user sees one more letter instead of "…".
       flex-basis 0 distributes the remaining space (after the LIVE
       tag) entirely to the name; min-width 0 lets it shrink below the
       nowrap content size the default min-width:auto would otherwise
       pin it to. */
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
  }

  .l3rd.is-visible .l3rd__name {
    opacity: 1;
  }

  .l3rd.is-entering .l3rd__name {
    animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
  }

  /* Channel tag */
  .l3rd__tag {
    display: flex;
    align-items: center;
    gap: 1.11cqh;
    flex-shrink: 0;
    opacity: 0;
  }

  .l3rd.is-visible .l3rd__tag {
    opacity: 1;
  }

  .l3rd.is-entering .l3rd__tag {
    animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
  }

  .l3rd__tag-dot {
    width: 0.93cqh;
    height: 0.93cqh;
    border-radius: 50%;
    background: #ef4444;
    flex-shrink: 0;
  }

  .l3rd.is-visible .l3rd__tag-dot {
    animation: livePulse 1.8s ease-in-out 1s infinite;
  }

  .l3rd__tag-label {
    font-size: 2.04cqh;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ── Divider ──────────────────────────────────── */

  .l3rd__divider {
    height: 0.19cqh;
    background: linear-gradient(90deg, rgba(135,160,222,0.35) 0%, transparent 70%);
    margin: 0 3.06cqh;
  }

  /* ── Title row ────────────────────────────────── */

  .l3rd__title-row {
    background: rgba(5, 8, 18, 0.88);
    padding: 2.31cqh 5cqh 3.7cqh 3.06cqh;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6.67cqh;
  }

  .l3rd__title {
    font-size: 3.33cqh;
    font-weight: 400;
    color: #87A0DE;
    letter-spacing: 0.04em;
    white-space: nowrap;
    opacity: 0;
    /* Same hard-clip rule as .l3rd__name — title shrinks first, the
       channel label keeps its natural width. */
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
  }

  .l3rd.is-visible .l3rd__title {
    opacity: 1;
  }

  .l3rd.is-entering .l3rd__title {
    animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.48s both;
  }

  /* Bottom-right channel label */
  .l3rd__channel {
    font-size: 2.04cqh;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.28);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    opacity: 0;
    flex-shrink: 0;   /* keep full width — title is the shrinker */
  }

  .l3rd.is-visible .l3rd__channel {
    opacity: 1;
  }

  .l3rd.is-entering .l3rd__channel {
    animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
  }

  /* ── Exit animations ──────────────────────────── */

  .l3rd__name.is-exiting,
  .l3rd__tag.is-exiting {
    animation: textOut 0.18s ease-in both;
  }

  .l3rd__title.is-exiting,
  .l3rd__channel.is-exiting {
    animation: textOut 0.18s ease-in 0.05s both;
  }

  /* ── Update animations ────────────────────────── */

  .l3rd__name.is-out,
  .l3rd__tag.is-out,
  .l3rd__title.is-out,
  .l3rd__channel.is-out {
    animation: textOut 0.15s ease-in both;
  }

  .l3rd__name.is-in,
  .l3rd__tag.is-in,
  .l3rd__title.is-in,
  .l3rd__channel.is-in {
    animation: textIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
`;

export default class OGrafLowerThird extends HTMLElement {
    constructor() {
        super();
        this._state = { ...DEFAULT_STATE };
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._shadow = this.attachShadow({ mode: 'open' });
        this._actionRevision = 0;
        this._activeAnimations = new Set();
        this._pendingDelays = new Set();
        this._resizeObserver = null;
    }

    async load({ data = {}, renderType, renderCharacteristics } = {}) {
        this._cancelPendingAction();
        this._disconnectResizeObserver();
        this._state = { ...DEFAULT_STATE, ...data };
        this._currentStep = undefined;
        this._lifecycleState = 'start';
        this._buildDOM();
        this._updateDOM();
        this._updateLayout(renderCharacteristics?.resolution);
        this._observeSize();

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

        if (this._lifecycleState !== 'step') {
            this._currentStep = 0;
            this._lifecycleState = 'step';
            await this._showGraphic(params.skipAnimation, actionRevision);
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
        this._state = { ...this._state, ...data };

        if (skipAnimation || this._lifecycleState !== 'step') {
            this._updateDOM();

            return { statusCode: 200 };
        }

        const textElements = this._textElements();
        textElements.forEach(element => element.classList.add('is-out'));
        const canContinue = await this._wait(UPDATE_OUT_DURATION_MS, actionRevision);
        if (!canContinue) return { statusCode: 200 };

        this._updateDOM();
        textElements.forEach(element => {
            element.classList.remove('is-out');
            element.classList.add('is-in');
        });
        await this._wait(UPDATE_IN_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            textElements.forEach(element => element.classList.remove('is-in'));
        }

        return { statusCode: 200 };
    }

    async customAction({ id } = {}) {
        return {
            statusCode: 400,
            statusMessage: `Unknown custom action: ${String(id)}`
        };
    }

    async dispose() {
        this._cancelPendingAction();
        this._disconnectResizeObserver();
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
        for (const animation of this._activeAnimations) animation.cancel();
        this._activeAnimations.clear();
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

    _animate(element, keyframes, options) {
        const animation = element.animate(keyframes, options);
        this._activeAnimations.add(animation);
        animation.finished
            .catch(() => undefined)
            .finally(() => this._activeAnimations.delete(animation));

        return animation;
    }

    async _showGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.l3rd');
        if (!graphic) return;

        graphic.style.transform = 'translateX(-150%)';
        graphic.classList.add('is-visible');
        if (skipAnimation) {
            graphic.style.transform = 'translateX(0)';
            return;
        }

        graphic.classList.add('is-entering');
        const slideAnimation = this._animate(
            graphic,
            [
                { transform: 'translateX(-150%)' },
                { transform: 'translateX(0)' }
            ],
            {
                duration: 600,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'forwards'
            }
        );
        await this._wait(PLAY_TRANSITION_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            graphic.style.transform = 'translateX(0)';
            graphic.classList.remove('is-entering');
            slideAnimation.cancel();
        }
    }

    async _hideGraphic(skipAnimation, actionRevision) {
        const graphic = this._shadow.querySelector('.l3rd');
        if (!graphic) return;

        if (skipAnimation || !graphic.classList.contains('is-visible')) {
            graphic.style.transform = 'translateX(-150%)';
            graphic.classList.remove('is-visible', 'is-entering');
            return;
        }

        const textElements = this._textElements();
        textElements.forEach(element => element.classList.add('is-exiting'));
        const canContinue = await this._wait(STOP_TEXT_DURATION_MS, actionRevision);
        if (!canContinue) return;

        const currentTransform = getComputedStyle(graphic).transform;
        graphic.style.transform = currentTransform === 'none'
            ? 'translateX(0)'
            : currentTransform;
        graphic.classList.remove('is-visible', 'is-entering');
        const slideAnimation = this._animate(
            graphic,
            [
                { transform: graphic.style.transform },
                { transform: 'translateX(-150%)' }
            ],
            {
                duration: STOP_SLIDE_DURATION_MS,
                easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
                fill: 'forwards'
            }
        );
        await this._wait(STOP_SLIDE_DURATION_MS, actionRevision);
        if (this._isCurrentAction(actionRevision)) {
            graphic.style.transform = 'translateX(-150%)';
            slideAnimation.cancel();
            textElements.forEach(element => element.classList.remove('is-exiting'));
        }
    }

    _clearTransientClasses() {
        this._shadow.querySelector('.l3rd')?.classList.remove('is-entering');
        this._textElements().forEach(element => {
            element.classList.remove('is-exiting', 'is-out', 'is-in');
        });
    }

    _textElements() {
        return [
            ...this._shadow.querySelectorAll(
                '.l3rd__name, .l3rd__tag, .l3rd__title, .l3rd__channel'
            )
        ];
    }

    _playResult() {
        return {
            statusCode: 200,
            currentStep: this._currentStep,
            result: { ...this._state }
        };
    }

    _observeSize() {
        if (!('ResizeObserver' in window)) return;
        this._resizeObserver = new ResizeObserver(entries => {
            const { width, height } = entries[0]?.contentRect ?? {};
            this._updateLayout({ width, height });
        });
        this._resizeObserver.observe(this);
    }

    _disconnectResizeObserver() {
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    _updateLayout({ width, height } = {}) {
        if (!(width > 0) || !(height > 0)) return;
        const aspectRatio = width / height;
        if (aspectRatio < PORTRAIT_ASPECT_RATIO) {
            this.dataset.layout = 'portrait';
        } else if (aspectRatio < COMPACT_ASPECT_RATIO) {
            this.dataset.layout = 'compact';
        } else {
            this.dataset.layout = 'landscape';
        }
    }

    _buildDOM() {
        this._shadow.innerHTML = `
            <style>${CSS}</style>
            <div class="l3rd-anchor">
                <div class="l3rd" style="transform: translateX(-150%)" aria-live="polite">
                    <div class="l3rd__topline" aria-hidden="true"></div>
                    <div class="l3rd__body">
                        <div class="l3rd__bar" aria-hidden="true"></div>
                        <div class="l3rd__content">
                            <div class="l3rd__name-row">
                                <span class="l3rd__name"></span>
                                <div class="l3rd__tag" aria-label="Live">
                                    <div class="l3rd__tag-dot" aria-hidden="true"></div>
                                    <span class="l3rd__tag-label">Live</span>
                                </div>
                            </div>
                            <div class="l3rd__divider" aria-hidden="true"></div>
                            <div class="l3rd__title-row">
                                <span class="l3rd__title"></span>
                                <span class="l3rd__channel"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _updateDOM() {
        const valuesBySelector = {
            '.l3rd__name': this._state.name,
            '.l3rd__title': this._state.title,
            '.l3rd__channel': this._state.channel
        };
        for (const [selector, value] of Object.entries(valuesBySelector)) {
            const element = this._shadow.querySelector(selector);
            if (element) element.textContent = String(value);
        }
    }
}
