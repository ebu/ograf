# EBU OGraf - Server API

## About

EBU OGraf Server API defines a RESTful API to be used between **OGraf Controllers** and **OGraf Renderers**.

Examples of typical **OGraf Controllers** are automation systems, or Graphics Controller clients.


_(Looking for the OGraf Graphics specification instead? See [OGraf Graphics specification](Specification.md).)_


## Definition

The OGraf Server API is defined as an [OpenAPI](https://www.openapis.org/) definition.

* [The .yaml definition can be found here](https://github.com/ebu/ograf/blob/main/v1/specification/open-api/server-api.yaml).
* [Human-readable docs can be found here](https://ograf.ebu.io/v1/specification/open-api/docs/index.html)


## Additional notes

### Base URL and path prefixes

A Server MAY expose the OGraf Server API under any base URL and path prefix.
All paths defined in the OpenAPI document are relative to that base URL.

For example, if the base URL is `https://example.com/my/prefix/ograf/v1`, the OpenAPI path `/graphics` is available at `https://example.com/my/prefix/ograf/v1/graphics`.

The `/ograf/v1` path prefix used in examples is allowed, but not required.

### Graphic data validation (optional)

* The Server MAY validate `params.data` sent to `load()` or `updateAction()` against the Graphic Manifest's `schema` field.
* Handling data that does not conform to the schema is implementation-specific. The specification does not require a hard failure or prescribe an HTTP status code or response body.

### Security (optional)

* The current version of the Server API doesn't specify any security measures.
* It is up to the vendor to ensure security/authentication.
* Future versions of the Server API may include optional/recommended security/authentication methods.

### CORS (optional)

To ensure that web-based Graphics Controllers can access the API, the Server MAY add the following [CORS](http://www.w3.org/TR/cors) headers to all responses:

```yaml
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, PUT, POST, HEAD, OPTIONS, DELETE
Access-Control-Allow-Headers: Content-Type, Accept
Access-Control-Max-Age: 3600
```
