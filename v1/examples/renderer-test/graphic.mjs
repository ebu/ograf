class Graphic extends HTMLElement {
  connectedCallback() {
    // Called when the element is added to the DOM
    // Note: Don't paint any pixels at this point, wait for load() to be called
  }

  async load(params) {
    this.style.fontSize = "24px";

    // Note: the OGraf specification says that the load() method should not paint any pixels.
    // This directive is ignored in this test graphic.

    const infoMessageContainer = document.createElement("div");
    infoMessageContainer.style.color = "#000";
    infoMessageContainer.style.position = "absolute";
    infoMessageContainer.style.top = "25%";
    infoMessageContainer.style.left = "0%";
    infoMessageContainer.style.right = "0%";
    infoMessageContainer.style.textAlign = "center";
    infoMessageContainer.style.zIndex = 1;
    this.appendChild(infoMessageContainer);


    const infoMessage = document.createElement("div");
    infoMessage.style.backgroundColor = "#ffffff";
    infoMessage.style.display = "inline-block";
    infoMessage.style.padding = "1em";
    infoMessageContainer.appendChild(infoMessage);
    this.infoMessage = infoMessage

    this._infoMessage('Starting up...')

    if (params.renderCharacteristics &&
      params.renderCharacteristics.resolution
    ) {
      // This fills the background with a red box, which should be covered by the blue fill below
      const fullContainer = document.createElement("div");
      fullContainer.style.position = "absolute";
      fullContainer.style.top = '0'
      fullContainer.style.left = '0'
      fullContainer.style.right = '0'
      fullContainer.style.bottom = '0'
      fullContainer.style.backgroundColor = "#f00";
      this.appendChild(fullContainer);

      // This paints a blue box, which should be the size of the renderer
      const sizedContainer = document.createElement("div");
      sizedContainer.style.position = "absolute";
      sizedContainer.style.top = '0'
      sizedContainer.style.left = '0'
      sizedContainer.style.width = `${params.renderCharacteristics.resolution.width}px`
      sizedContainer.style.height = `${params.renderCharacteristics.resolution.height}px`
      sizedContainer.style.backgroundColor = "#87a0de";
      this.appendChild(sizedContainer);

    }

    return this._handleAction('load', params);
  }
  async dispose(_params) {
    this.innerHTML = "";
  }
  async updateAction(params) {
    return this._handleAction('updateAction', params);
  }
  async playAction(params) {
    return this._handleAction('playAction', params);
  }
  async stopAction(params) {
    return this._handleAction('stopAction', params);
  }
  async customAction(params) {
    return this._handleAction('customAction', params);
  }

  loggedActions = []
  _handleAction(type, params) {
    const lastAction = { type, params }
    this.loggedActions.push(lastAction);

    const currentStep = this.steps[this.stepIndex]
    if (!currentStep) {
      return this._infoMessage('No more steps to verify, this test is completed');
    }
    let error = currentStep.verify(lastAction)


    if (!error) {
      this.stepIndex++

      const nextStep = this.steps[this.stepIndex]

      if (nextStep) {
        return this._infoMessage(`${currentStep.completed ? `${currentStep.completed}\n` : ''}Step ${this.stepIndex} completed.\nNext, ${nextStep.prompt}`);
      } else {
        return this._infoMessage('No more steps to verify, this test is completed');
      }
    } else {

      this._errorMessage(`Expected ${currentStep.prompt}\n${error}`)

    }
  }


  _errorMessage(error) {
    this.infoMessage.innerHTML = this._formatText(error)
    this.infoMessage.style.backgroundColor = "#bb0000";
    this.infoMessage.style.color = "#fff";

    return {
      statusCode: 400,
      statusMessage: error
    }
  }
  _infoMessage(str) {
    this.infoMessage.innerHTML = this._formatText(str)
    this.infoMessage.style.backgroundColor = "#fff";
    this.infoMessage.style.color = "#000";

    return {
      statusCode: 200,
      statusMessage: str
    }
  }
  _formatText(str) {
    return str.replaceAll(/\n/g, "<br>");
  }


  steps = [
    {
      prompt: 'N/A',
      completed: 'load() method seems okay!',
      verify: (lastAction) => {
        if (lastAction.type !== 'load') return 'Expected the load() method to be called'
        if (lastAction.params.renderType !== 'realtime') return 'Only realtime rendering is supported by this graphic!'
        if (!lastAction.params.data) return 'No `data` argument provided to the load() method'
        if (!lastAction.params.data.message) return 'Expected a `message` argument in the `data` object provided to the load() method'
      }
    },
    {
      prompt: 'call the playAction() method (with no skipAnimation set)',
      verify: (lastAction) => {
        if (lastAction.type !== 'playAction') return 'Expected the playAction() method to be called';
        if (lastAction.params.skipAnimation) return 'Expected "skipAnimation" to be undefined or false, got true';
      }
    },
    {
      prompt: 'call the playAction() method, with skipAnimation set to true.',
      verify: (lastAction) => {
        if (lastAction.type !== 'playAction')   return 'Expected the playAction() method to be called';
        if (lastAction.params.skipAnimation !== true) return `Expected the playAction to be called with { skipAnimation: true }, got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: `call the playAction() method, with 'goto' set to 4.`,
      verify: (lastAction) => {
        if (lastAction.type !== 'playAction') return 'Expected the playAction() method to be called';
        if (lastAction.params.goto !== 4) return `Expected the playAction to be called with 'goto' set to 4, got ${JSON.stringify(lastAction.params)}`;
        if (lastAction.params.delta !== undefined) return `Expected the playAction to be called with 'delta' being undefined, got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: `call the playAction() method, with 'delta' set to -1.`,
      verify: (lastAction) => {
        if (lastAction.type !== 'playAction') return 'Expected the playAction() method to be called';
        if (lastAction.params.delta !== -1) return `Expected the playAction to be called with 'delta' set to -1, got ${JSON.stringify(lastAction.params)}`;
        if (lastAction.params.goto !== undefined) return `Expected the playAction to be called with 'goto' being undefined, got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: `call the updateAction() method, with data { message: 'Hello' }`,
      verify: (lastAction) => {
        if (lastAction.type !== 'updateAction') return 'Expected the updateAction() method to be called';
        if (lastAction.params.data.message !== 'Hello') return `Expected the updateAction to be called with 'delta' set to -1, got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: `call the stopAction() method`,
      verify: (lastAction) => {
        if (lastAction.type !== 'stopAction') return 'Expected the stopAction() method to be called';
      }
    },
    {
      prompt: 'call the stopAction() method, with skipAnimation set to true.',
      verify: (lastAction) => {
        if (lastAction.type !== 'stopAction')   return 'Expected the stopAction() method to be called';
        if (lastAction.params.skipAnimation !== true) return `Expected the stopAction to be called with { skipAnimation: true }, got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: 'call the customAction() method for the "highlight" action',
      verify: (lastAction) => {
        if (lastAction.type !== 'customAction') return 'Expected the customAction() method to be called';
        if (lastAction.params.id !== 'highlight') return `Expected the customAction() method to be called with id "highlight", got ${JSON.stringify(lastAction.params)}`;
      }
    },
    {
      prompt: 'call the customAction() method for the "setColor" action, with payload { color: "red" }',
      verify: (lastAction) => {
        if (lastAction.type !== 'customAction') return 'Expected the customAction() method to be called';
        if (lastAction.params.id !== 'setColor') return `Expected the customAction() method to be called with id "setColor", got ${JSON.stringify(lastAction.params)}`;
        if (typeof lastAction.params.payload !== 'object') return `Property "payload" is missing in argument, got ${JSON.stringify(lastAction.params)}`;
        if (lastAction.params.payload.color !== 'red') return `Expected property "payload.color" to have the value "red", got ${JSON.stringify(lastAction.params)}`;
      }
    },
  ]

  stepIndex = 0
}

export default Graphic;
