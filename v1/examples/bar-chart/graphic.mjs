const ENTER_DURATION = 500;
const STEP_DURATION = 450;
const EXIT_DURATION = 400;

const CSS = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: Arial, Helvetica, sans-serif;
    color: #050505;
    background: #3974c8;
  }

  .background-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .chart {
    box-sizing: border-box;
    position: absolute;
    inset: 6.5% 5.7% auto;
    height: 64.8%;
    padding: 3.3% 3.1% 3.5%;
    border-radius: 20px;
    background: linear-gradient(135deg, #cadbff, #9ab8f4);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity ${ENTER_DURATION}ms ease, transform ${ENTER_DURATION}ms ease;
  }

  .chart.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .chart.is-exiting {
    opacity: 0;
    transform: translateY(-18px);
    transition-duration: ${EXIT_DURATION}ms;
  }

  h1 {
    margin: 0;
    font-size: clamp(28px, 4.1vw, 72px);
    line-height: 1;
  }

  .plot {
    position: absolute;
    inset: 20% 12% 13%;
    display: flex;
    align-items: stretch;
    border-bottom: 2px solid #1c2838;
  }

  .point {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .bar {
    width: 48%;
    min-height: 0;
    background: #0ca5d8;
    transform-origin: bottom;
    transform: scaleY(0);
    transition: transform ${STEP_DURATION}ms cubic-bezier(.22, 1, .36, 1);
  }

  .point.is-revealed .bar {
    transform: scaleY(1);
  }

  .value,
  .label {
    position: absolute;
    white-space: nowrap;
    font-size: clamp(16px, 1.8vw, 34px);
  }

  .value {
    bottom: calc(var(--bar-height) + 1.2%);
    transform: translateY(100%);
  }

  .label {
    top: calc(100% + 2.1%);
  }
`;

function resolveTargetStep(currentStep, { delta = 1, goto } = {}, stepCount) {
  if (Number.isInteger(goto) && goto >= 0) return goto;
  return (currentStep ?? -1) + (Number.isInteger(delta) ? delta : 1);
}

function normalizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error('The Bar Chart requires at least one point.');
  }

  return points.map((point, index) => {
    const value = Number(point?.value);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Point ${index + 1} must have a non-negative numeric value.`);
    }
    return {
      label: String(point?.label ?? ''),
      value
    };
  });
}

export default class BarChartGraphic extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._currentStep = undefined;
    this._points = [];
    this._backgroundImage = '';
  }

  async load({ data = {} } = {}) {
    this._points = normalizePoints(data.points);
    this._backgroundImage = String(data.backgroundImage ?? './lib/background.svg');
    this._currentStep = undefined;
    this._buildDOM(data.title ?? 'Bar Chart Graphic');
    return { statusCode: 200 };
  }

  async updateAction({ data = {}, skipAnimation = false } = {}) {
    if (data.points !== undefined) this._points = normalizePoints(data.points);
    if (data.backgroundImage !== undefined) {
      this._backgroundImage = String(data.backgroundImage);
      const image = this._shadow.querySelector('.background-image');
      if (image) image.src = this._backgroundImage;
    }
    if (data.title !== undefined) {
      const title = this._shadow.querySelector('h1');
      if (title) title.textContent = String(data.title);
    }
    this._renderPoints(this._currentStep, skipAnimation);
    return { statusCode: 200 };
  }

  async playAction(params = {}) {
    const rawTarget = resolveTargetStep(this._currentStep, params, this._points.length);
    if (rawTarget >= this._points.length) {
      await this.stopAction(params);
      return { statusCode: 200, currentStep: undefined };
    }

    const targetStep = Math.max(0, rawTarget);
    const chart = this._shadow.querySelector('.chart');
    const wasVisible = chart?.classList.contains('is-visible');
    this._currentStep = targetStep;
    this._renderPoints(targetStep, params.skipAnimation);

    if (!wasVisible && chart) {
      chart.classList.add('is-visible');
      if (!params.skipAnimation) await this._wait(ENTER_DURATION);
    } else if (!params.skipAnimation) {
      await this._wait(STEP_DURATION);
    }

    return { statusCode: 200, currentStep: targetStep };
  }

  async stopAction({ skipAnimation = false } = {}) {
    const chart = this._shadow.querySelector('.chart');
    if (chart && !skipAnimation && chart.classList.contains('is-visible')) {
      chart.classList.add('is-exiting');
      await this._wait(EXIT_DURATION);
    }
    chart?.classList.remove('is-visible', 'is-exiting');
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  async dispose() {
    this._shadow.innerHTML = '';
    this._points = [];
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  _buildDOM(title) {
    this._shadow.innerHTML = `<style>${CSS}</style>
      <img class="background-image" alt="" aria-hidden="true">
      <section class="chart" aria-label="Bar chart">
        <h1></h1>
        <div class="plot"></div>
      </section>`;
    this._shadow.querySelector('h1').textContent = title;
    this._shadow.querySelector('.background-image').src = this._backgroundImage;
    this._renderPoints(undefined, true);
  }

  _renderPoints(step, skipAnimation) {
    const plot = this._shadow.querySelector('.plot');
    if (!plot) return;

    const maxValue = Math.max(...this._points.map(point => point.value), 1);
    plot.innerHTML = this._points.map((point, index) => {
      const height = `${(point.value / maxValue) * 82}%`;
      const revealed = Number.isInteger(step) && index <= step;
      return `<div class="point${revealed ? ' is-revealed' : ''}" style="--bar-height:${height}">
        <span class="value">${point.value}</span>
        <div class="bar" style="height:${height}"></div>
        <span class="label">${point.label}</span>
      </div>`;
    }).join('');

    if (skipAnimation) {
      plot.querySelectorAll('.bar').forEach(bar => {
        bar.style.transition = 'none';
      });
    }
  }

  _wait(duration) {
    return new Promise(resolve => window.setTimeout(resolve, duration));
  }
}
