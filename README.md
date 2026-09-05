# OGraf

<img src="docs/logo/ograf-logo-colour.svg" width="300"/>

**OGraf** is an Open specification for HTML based Graphics, used in live television and post production workflows.

* [Link to Project Web Page](https://ograf.ebu.io)
* [Link to Project Github repository ](https://github.com/ebu/ograf)

## Project status

**Version 1** includes the **The OGraf Graphics specification** (published 2025-09-17) as well as the **The OGraf Server API specification** (published 2026-08-13).
The OGraf versions are considered stable and production ready. Future changes and additions to the specification will be backwards-compatible and/or optional.

EBU members as well as the general industry is invited to join the [HTML Graphics Working Group](https://tech.ebu.ch/groups/html-graphics) to participate in discussions and continued development of the OGraf specification.

Feedback can also be submitted using [GitHub Issues](https://github.com/ebu/ograf/issues).

Graphics and Render system developers are encouraged to follow changes in the [Changelog](./CHANGELOG.md).

### Version History

- 2025-09-17: Version 1 of **Graphics definition** published
- 2026-08-13: Version 1 of **Server API** published.

A detailed changelog can be found here: _[CHANGELOG.md](./CHANGELOG.md)_

## Introduction

The OGraf specification defines a way to create HTML based graphics as well as an Server API for controlling OGraf-compatible renderers.
It allows for vendor interoperability between Graphics, Rendering systems and Control systems.

## Getting Started

Useful resources:
* [Examples of OGraf Graphics](https://github.com/ebu/ograf/tree/main/v1/examples).
* [OGraf Specification](./v1/specification/docs/README.md).


### Tools

* The **[OGraf Devtool](https://github.com/SuperFlyTV/ograf-devtool)** is a tool for developing OGraf graphics.
* The **[OGraf Simple Rendering System](https://github.com/SuperFlyTV/ograf-server)** can be used to play OGraf Graphics in a browser (for use in any existing system capable of rendering HTML graphics).

### Website

The landing page is served from the repository root by GitHub Pages. See
[website/README.md](./website/README.md) for local development and instructions for
maintaining website examples and logos.
