class Graphic extends HTMLElement {
  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(params) {
    if (params.renderType !== "realtime")
      throw new Error("Only realtime rendering is supported by this graphic");

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
  async getStatus(_params) {
    return {
      statusCode: 200,
      status: {
        // nothing
      },
    };
  }
  async updateAction(_params) {
    // No actions are implemented in this minimal example
  }
  async playAction(_params) {
    // No actions are implemented in this minimal example
  }
  async stopAction(_params) {
    // No actions are implemented in this minimal example
  }
  async customAction(params) {
    // No actions are implemented in this minimal example
  }
}

export default Graphic;

// Note: The renderer will render the component
