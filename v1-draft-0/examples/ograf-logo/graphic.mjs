class Graphic extends HTMLElement {
  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(params) {
    if (params.renderType !== "realtime")
      throw new Error("Only realtime rendering is supported by this graphic");

    const logo = document.createElement("img");
    logo.src = await this._loadImage(
      import.meta.resolve("./lib/ograf-logo-app.svg")
    );
    logo.style.opacity = 0;
    logo.style.position = "absolute";
    logo.style.left = `calc(5%)`;
    logo.style.bottom = `calc(85%)`;
    logo.style.width = "50px";
    logo.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    logo.style.borderRadius = "5px";
    this.appendChild(logo);


    this.elements = {
      logo,
    };

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
    // No updateActions are implemented in this example
  }
  async playAction(_params) {
    // Fade in logo
    this.elements.logo.style.transition = "opacity 1s";
    this.elements.logo.style.opacity = "1";
  }
  async stopAction(_params) {
    // fade out logo
    this.elements.logo.style.transition = "opacity 1s";
    this.elements.logo.style.opacity = "0";
  }
  async customAction(params) {
    // No customAction are implemented in this example
  }
  async goToTime(_payload) {
    throw new Error("Non-realtime not supported!");
  }
  async setActionsSchedule(_payload) {
    throw new Error("Non-realtime not supported!");
  }
  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const newImg = new Image();
      newImg.onload = function () {
        resolve(this.src);
      };
      newImg.onerror = reject;
      newImg.src = url;
    });
  }
}

export default Graphic;

// Note: The renderer will render the component
