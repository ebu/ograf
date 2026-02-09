# EBU OGraf Typescript Definitions

[![NPM Version](https://img.shields.io/npm/v/ograf)](https://www.npmjs.com/package/ograf)

Typescript definitions for _OGraf Graphics_ and _OGraf Server API_, see the [OGraf website](https://ograf.ebu.io).

## Getting Started

### OGraf Graphics
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

### OGraf Server API

```typescript
import { ServerApi } from 'ograf'

// The ServerAPI is auto-generated from the OGraf Server API OpenAPI definition.
// The types can be useful when you implement your OGraf Server:
type Method = ServerApi.paths['/renderers/{rendererId}/target/graphicInstance/playAction']['post']
const requestBody: Method['requestBody']
const requestParameters: Method['parameters']
const successResponse: Method['responses']['200']['content']['application/json']
const error500Response: Method['responses']['500']['content']['application/json']
```

## For Developers

The instructions below are for developers who want to work on the Typescript definitions.

Note: All types in this package are based on the [OGraf Specification](https://ograf.ebu.io). In case of any discrepancy between the two, this package is to be updated to match the OGraf Specification.

### Install & build

```bash

npm install
npm run generate-types # Run this if the Graphics API has changed
npm run generate-server-types # Run this if the server API has changed


npm run build
# or
npm run watch

```

### Publish to NPM

To publish a new version to NPM:

1. Bump the version `npm version major|minor|patch`
2. Commit and push to GitHub
3. Go to the Actions tab and trigger the "Publish to NPM" workflow

To publish a nightly build to NPM:

1. Go to the Actions tab and trigger the "Publish nightly to NPM" workflow
