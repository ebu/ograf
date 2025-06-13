# OGraf Typescript Definitions

These are Typescript definitions for the OGraf API.

https://github.com/ebu/ograf

## Getting Started

```typescript

import { GraphicsAPI } from 'ograf';


// Setup my OGraf graphic WebComponent:
class MyOGrafGraphic extends HTMLElement implements GraphicsAPI.Graphic {
    connectedCallback() {
        // Called when the element is added to the DOM
        // Note: Don't paint any pixels at this point, wait for load() to be called
    }

    async load(params) {
        if (params.renderType !== "realtime")
        throw new Error("Only realtime rendering is supported by this graphic");

        const elText = document.createElement("p");
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
    async playAction(_params) {
        // No actions are implemented in this minimal example
    }
    async stopAction(_params) {
        // No actions are implemented in this minimal example
    }
    async customAction(params) {
        // No actions are implemented in this minimal example
    }
    async goToTime(_payload) {
        throw new Error("Non-realtime not supported!");
    }
    async setActionsSchedule(_payload) {
        throw new Error("Non-realtime not supported!");
    }
}

```


## For Developers

The instructions below are for developers who want to work on the Typescript definitions.

### Install & build

```bash

npm install
npm run build
# or
npm run watch

```
