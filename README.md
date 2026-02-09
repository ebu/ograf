# OGraf

<img src="docs/logo/ograf-logo-colour.svg" width="300"/>

**OGraf** is an Open specification for HTML based Graphics, used in live television and post production workflows.

* [Link to Project Web Page](https://ograf.ebu.io)
* [Link to Project Github repository ](https://github.com/ebu/ograf)

## Project status

* **The OGraf Graphics specification** (version 1) is production ready and considered stable.

  Additional features and non-breaking changes will be added continously.
* **The OGraf Control API specification** is published as a draft, expected to be finalized Mid 2026.

  Breaking changes may be introduced to the Server API during the draft period.

EBU members as well as the general industry is invited to join the [HTML Graphics Working Group](https://tech.ebu.ch/groups/html_graphics) to participate in discussions and development of the OGraf specification.

Feedback can also be submitted using [GitHub Issues](https://github.com/ebu/ograf/issues).

Graphics and Render system developers are encouraged to follow changes in the [Changelog](./CHANGELOG.md).

### Time plan

- **Done:**
  - Version 1 of **Graphics definition** (2025-09-17).
  - First draft of **Server API** published (2026-02-09).
- Q1+Q2 2026:
  - Feedback from the industry on the **Server API**
- Mid 2026:
  - **Server API** definitions to be added to Version 1.
  - Continued work on improving the **OGraf Graphics specification**

## Introduction

The OGraf specification defines a way to create HTML based graphics as well as an (upcoming) Control API.
It allows for vendor interoperability between Graphics, Rendering systems and Control systems.

## Getting Started

Useful resources:
* [Examples of OGraf Graphics](https://github.com/ebu/ograf/tree/main/v1/examples).
* [OGraf Specification](./v1/specification/docs/README.md).


### Tools

* The **[OGraf Devtool](https://github.com/SuperFlyTV/ograf-devtool)** is a tool for developing OGraf graphics.
* The **[OGraf Simple Rendering System](https://github.com/SuperFlyTV/ograf-server)** can be used to play OGraf Graphics in a browser (for use in any existing system capable of rendering HTML graphics).
