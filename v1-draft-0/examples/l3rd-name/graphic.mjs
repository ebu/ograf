

/**
 * Note:
 *
 * @typedef { import('../../typescript-definitions/src/main').GraphicsAPI.Graphic } Graphic
 */

/** @implements { Graphic } */
class MyGraphic extends HTMLElement {
  constructor() {
    super();
    this.nonRealTimeState = {};
  }
  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(loadParams) {
    // 1. Load resources
    // 2. Setup the DOM
    // 3. Initialize the GSAP timeline

    // Load the GSAP scripts ---------------------------------------------------
    const importsPromises = {
      gsap: import(import.meta.resolve("./lib/gsap-core.js")),
      CSSPlugin: import(import.meta.resolve("./lib/CSSPlugin.js")),
      TextPlugin: import(import.meta.resolve("./lib/TextPlugin.js")),
    };

    this.g = await importsPromises.gsap;
    this.g.gsap.registerPlugin((await importsPromises.CSSPlugin).CSSPlugin);
    this.g.gsap.registerPlugin((await importsPromises.TextPlugin).TextPlugin);

    // Setup our DOM -----------------------------------------------------------
    const container = document.createElement("div");
    this.appendChild(container);

    container.style.position = "absolute";
    container.style.left = "10%";
    container.style.bottom = "10%";
    container.style.padding = "10px 20px";
    container.style.backgroundColor = "#f00";
    container.style.color = "#fff";
    container.style.fontFamily = "Roboto, sans-serif";
    container.style.fontSize = "24px";
    container.style.fontWeight = "bold";

    const nameText = document.createElement("div");
    nameText.innerText = "";
    container.appendChild(nameText);

    this.elements = {
      container,
      nameText,
    };

    // Initialize the GSAP timeline --------------------------------------------
    this.timeline = this.g.gsap.timeline();
    this._resetTimeline();

    if (loadParams.renderType === "realtime") {
      this.timeline.play(); // not really needed, it's playing by default
    } else if (loadParams.renderType === "non-realtime") {
      this.timeline.pause();
    } else throw new Error("Unsupported renderType: " + loadParams.renderType);

    // When everything is loaded we can return:
    return;
  }
  async dispose(_payload) {
    this.innerHTML = "";
    this.g = null;
  }
  async getStatus(_payload) {
    return {};
  }
  async updateAction(params) {
    // params.data
    // console.log("params", params);

    await this._doAction("update", params);
  }
  async playAction(params) {
    // params.delta
    // params.goto
    // params.skipAnimation

    await this._doAction("play");
  }
  async stopAction(params) {
    // params.skipAnimation

    await this._doAction("stop");
  }
  async customAction(params) {
    // params.method
    // params.payload

    await this._doAction(params.method, params.payload);
  }
  async _doAction(method, payload) {
    const timeline = this.g.gsap.timeline();

    // Retrieve the tweens for the action:
    const tweens = this._getActionAnimation(method, payload);

    // Add the tweens to the timeline, so that they'll animate:
    for (const tween of tweens) {
      timeline.add(tween, 0);
    }
    // Wait for timeline to finish animating:
    await timeline.then();
  }
  async goToTime(payload) {
    this.nonRealTimeState.timestamp = payload.timestamp;

    await this._updateState();
  }
  async setActionsSchedule(payload) {
    this.nonRealTimeState.schedule = payload.schedule;

    await this._updateState();
  }
  async _updateState() {
    this._resetTimeline();

    // Initial state:

    for (const action of this.nonRealTimeState.schedule) {
      const tweens = this._getActionAnimation(
        action.invokeAction.method,
        action.invokeAction.payload
      );

      for (const tween of tweens) {
        this.timeline.add(tween, action.timestamp / 1000);
      }
    }

    this.timeline.seek(this.nonRealTimeState.timestamp / 1000);
  }
  _getActionAnimation(method, payload) {
    switch (method) {
      case "update":
        return this._getUpdateAnimation(payload);
      case "play":
        return this._getPlayAnimation(payload);
      case "stop":
        return this._getStopAnimation(payload);
      case "highlight":
        return this._getHighlightAnimation(payload);
      default:
        throw new Error(`Unknown method "${method}"`);
    }
  }
  _resetTimeline() {
    const gsap = this.g.gsap;

    // Clear the timeline:
    this.timeline.clear();

    // Initial animation state:
    const tweens = [
      gsap.set(this.elements.container, {
        x: -30,
        opacity: 0,
      }),
      gsap.set(this.elements.nameText, {
        text: "",
      }),
    ];

    // Add Tweens to the beginning of the timeline:
    for (const tween of tweens) {
      this.timeline.add(tween, 0);
    }
  }

  // -------------------- Actions --------------------
  _getUpdateAnimation(payload) {
    const gsap = this.g.gsap;

    return [
      gsap.to(this.elements.nameText, {
        duration: 0.4,
        text: payload.data.name,
      }),
    ];
  }
  _getPlayAnimation(payload) {
    const gsap = this.g.gsap;

    return [
      gsap.to(this.elements.container, {
        duration: 0.8,
        x: 0,
        opacity: 1,
        ease: "power2.out",
      }),

      gsap.to(this.elements.nameText, {
        duration: 0.4,
        // text: this._currentData.name,
      }),
    ];
  }
  _getStopAnimation(payload) {
    const gsap = this.g.gsap;

    return [
      gsap.to(this.elements.container, {
        duration: 0.8,
        x: -30,
        opacity: 0,
        ease: "power2.in",
      }),
    ];
  }
  _getHighlightAnimation(payload) {
    const gsap = this.g.gsap;

    return [
      gsap.to(this.elements.container, {
        duration: 0.8,
        backgroundColor: "#ff0",
        color: "#000",

        ease: "power2.in",
      }),
      gsap
        .to(this.elements.container, {
          duration: 0.8,
          backgroundColor: "#f00",
          color: "#fff",

          ease: "power2.in",
        })
        .delay(2),
    ];
  }
}

export default MyGraphic;

// Note: The renderer will render the component
