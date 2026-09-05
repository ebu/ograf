class Graphic extends HTMLElement {
  constructor() {
    super();
    this.currentStep = undefined;
  }

  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(params) {
    if (params.renderType !== "realtime")
      throw new Error("Only realtime rendering is supported by this graphic");

    this.currentStep = undefined;

    const elText = document.createElement("p");
    elText.style.backgroundColor = "#ffffff";
    elText.style.color = "#000000";
    elText.style.display = "inline-block";
    elText.style.padding = "10px";
    elText.style.border = "1px solid #000000";
    elText.innerHTML = "Hello world!";
    this.appendChild(elText);

    // When everything is loaded we can return:
    return {
      statusCode: 200,
    };
  }
  async dispose(_params) {
    this.innerHTML = "";
  }
  async updateAction(_params) {
    // No actions are implemented in this minimal example
  }
  async playAction(params = {}) {
    const targetStep = this._resolveTargetStep(params);
    this.currentStep = targetStep;

    return { statusCode: 200, currentStep: this.currentStep };
  }
  async stopAction(_params) {
    // No actions are implemented in this minimal example
    this.currentStep = undefined;
  }
  async customAction(params) {
    // No actions are implemented in this minimal example
  }
  _resolveTargetStep({ delta = 1, goto } = {}) {
    const targetStep = Number.isInteger(goto) && goto >= 0
      ? goto
      : (this.currentStep ?? -1) + (Number.isInteger(delta) ? delta : 1);

    return targetStep >= 1 ? undefined : 0;
  }
}

export default Graphic;

// Note: The renderer will render the component
