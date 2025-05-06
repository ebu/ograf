

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
    this.displayState = {}
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


    const myFontFace = new FontFace("Monsieur La Doulaise", "url(https://fonts.gstatic.com/s/monsieurladoulaise/v18/_Xmz-GY4rjmCbQfc-aPRaa4pqV340p7EZm5ZyEA.woff2)");
    document.fonts.add(myFontFace);
    await myFontFace.load()

    // Setup our DOM -----------------------------------------------------------
    const container = document.createElement("div");
    this.appendChild(container);

    container.style.position = "absolute";
    container.style.left = "calc(10% + 60px)";
    container.style.bottom = "calc(10% + 30px)";
    container.style.height = "32px";

    container.style.padding = "6px 20px";
    container.style.backgroundColor = "#f00";
    container.style.color = "#fff";

    container.style.fontFamily = myFontFace.family;
    // container.style.fontFamily = "Roboto, sans-serif";
    container.style.fontSize = "36px";
    // container.style.fontWeight = "bold";
    container.style.zIndex = "2";
    container.style.borderBottomRightRadius = "20px";
    container.style.borderTopRightRadius = "20px";
    container.style.borderTopLeftRadius = "20px";

    const nameText = document.createElement("div");
    nameText.innerText = "";
    container.appendChild(nameText);

    const container2 = document.createElement("div");
    this.appendChild(container2);

    container2.style.position = "absolute";
    container2.style.left = "calc(10% + 60px)";
    container2.style.bottom = "10%";
    container2.style.height = "23px";
    container2.style.padding = "5px 20px 2px 20px";
    container2.style.backgroundColor = "#b00";
    container2.style.color = "#fff";
    container2.style.fontFamily = "Roboto, sans-serif";
    container2.style.fontSize = "18px";
    container2.style.fontWeight = "bold";
    container2.style.zIndex = "1";
    container2.style.borderBottomRightRadius = "10px";
    container2.style.borderBottomLeftRadius = "10px";

    const nameText2 = document.createElement("div");
    nameText2.innerText = "";
    container2.appendChild(nameText2);

    const logo = document.createElement("img");
    logo.src = await this._loadImage(import.meta.resolve("./lib/ograf-logo-app.svg"))
    logo.style.position = "absolute";
    logo.style.left = `calc(10%)`
    logo.style.bottom = `calc(10% + 10px)`
    logo.style.width = "50px";
    logo.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    logo.style.borderRadius = "5px";
    this.appendChild(logo);



    this.elements = {
      container,
      nameText,
      container2,
      nameText2,
      logo
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
  async dispose(_params) {
    this.innerHTML = "";
    this.g = null;
  }
  async getStatus(_params) {
    return {};
  }
  async updateAction(params) {
    // params.data
    // console.log("params", params);

    await this._doAction("updateAction", params);
  }
  async playAction(params) {
    // params.delta
    // params.goto
    // params.skipAnimation

    await this._doAction("playAction");
  }
  async stopAction(params) {
    // params.skipAnimation

    await this._doAction("stopAction");
  }
  async customAction(params) {
    // params.id
    // params.payload

    await this._doAction('customAction', params);
  }
  async _doAction(type, params) {
    const timeline = this.g.gsap.timeline();

    // Retrieve the tweens for the action:
    const tweens = this._getActionAnimation(type, params);

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

    for (const event of (this.nonRealTimeState.schedule || [])) {
      const tweens = this._getActionAnimation(
        event.action.type,
        event.action.params
      );

      for (const tween of tweens) {
        this.timeline.add(tween, event.timestamp / 1000);
      }
    }

    this.timeline.seek(this.nonRealTimeState.timestamp / 1000);
  }
  _getActionAnimation(type, params) {
    switch (type) {
      case "updateAction":
        return this._getUpdateAnimation(params);
      case "playAction":
        return this._getPlayAnimation(params);
      case "stopAction":
        return this._getStopAnimation(params);
      case "customAction":
        {
          switch (params.id) {
            case "highlight":
              return this._getHighlightAnimation(params.payload);
            default:
              throw new Error(`Unknown customAction id "${params.id}"`);
          }
        }
      default:
        throw new Error(`Unknown action type "${type}"`);
    }
  }
  _resetTimeline() {
    const gsap = this.g.gsap;

    this.displayState = {}

    // Clear the timeline:
    this.timeline.clear();

    // Initial animation state:
    const tweens = [
      gsap.set(this.elements.container, {
        x: -30,
        backgroundColor: "#f00",
        color: "#fff",
        opacity: 0,
      }),
      gsap.set(this.elements.nameText, {
        text: "",
      }),
      gsap.set(this.elements.container2, {
        y: -20,
        opacity: 0,
      }),
      gsap.set(this.elements.nameText2, {
        text: "",
      }),
      gsap.set(this.elements.logo, {
        scale: 0.5,
        opacity: 0
      }),
    ];

    // Add Tweens to the beginning of the timeline:
    for (const tween of tweens) {
      this.timeline.add(tween, 0);
    }
  }

  // -------------------- Actions --------------------
  _getUpdateAnimation(params) {
    const gsap = this.g.gsap;

    this.displayState.data = params.data

    const showTitle = this.displayState.data.title
    const isPlaying = this.displayState.isPlaying

    return [
      gsap.to(this.elements.nameText, {
        duration: 0.4,
        text: params.data.name,
      }),
      gsap.to(this.elements.nameText2, {
        duration: 0.4,
        text: params.data.title,
      }),
      (
        isPlaying &&
          gsap.to(this.elements.container2, {
            duration: 0.3,
            y: 0,
            opacity: showTitle ? 1 : 0,
            ease: "power2.out",
          })
      ),
      (
        isPlaying &&
        gsap.to(this.elements.container, {
          duration: 0.3,
          borderBottomLeftRadius: showTitle ? "0" : "20px",
          ease: "power2.out",
        })
      )
    ];
  }
  _getPlayAnimation(params) {
    const gsap = this.g.gsap;

    this.displayState.isPlaying = true

    const showTitle = Boolean(this.displayState.data?.title)


    return [
      gsap.to(this.elements.container, {
        duration: 0.8,
        x: 0,
        opacity: 1,
        borderBottomLeftRadius: showTitle ? "0" : "20px",
        ease: "power2.out",
      }),

      gsap.to(this.elements.nameText, {
        duration: 0.4,
        // text: this._currentData.name,
      }),
      gsap.to(this.elements.container2, {
        delay: 0.3,
        duration: 0.8,
        y: 0,
        opacity: showTitle ? 1 : 0,
        ease: "power2.out",
      }),
      gsap.to(this.elements.nameText2, {
        delay: 0.7,
        duration: 0.8,
        // text: this._currentData.name,
      }),
      gsap.to(this.elements.logo, {
        duration: 0.5,
        opacity: 1,
      }),
      gsap.to(this.elements.logo, {
        duration: 1.5,
        rotation: 360,
        scale: 1
        // text: this._currentData.name,
      }),
    ];
  }
  _getStopAnimation(params) {
    const gsap = this.g.gsap;

    this.displayState.isPlaying = false

    return [
      gsap.to(this.elements.container, {
        delay: 0.3,
        duration: 0.8,
        x: -30,
        opacity: 0,
        ease: "power2.in",
      }),
      gsap.to(this.elements.container2, {
        duration: 0.5,
        y: -20,
        opacity: 0,
        ease: "power2.in",
      }),
      gsap.to(this.elements.logo, {
        duration: 0.8,
        rotation: 180,
        scale: 0.8,
        opacity: 0
      }),
    ];
  }
  _getHighlightAnimation(params) {
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
          delay: 2,
          duration: 0.8,
          backgroundColor: "#f00",
          color: "#fff",

          ease: "power2.in",
        }),
        gsap.to(this.elements.logo, {
          duration: 1,
          scale: 1.5,
          ease: "bounce.out",
        }),
        gsap.to(this.elements.logo, {
          delay: 1,
          duration: 1,
          scale: 1,
        }),

    ];
  }
  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const newImg = new Image;
      newImg.onload = function() {
        resolve(this.src)
      }
      newImg.onerror = reject;
      newImg.src = url
    })
  }
}

export default MyGraphic;

// Note: The renderer will render the component
