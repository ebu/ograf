# Changelog

This log lists changes between versions.




## Version 1 - Draft 0

This is a draft for Version 1. During its development, it may contain breaking changes.

The log below details the changes during development of this version:

* 2025-03-27: Draft 0 made public.
* 2025-04-23: Fix in JSON-schemas: Changed `main` property in Graphics manifest to be **mandatory**.
  (Before, it was defined as mandatory in the specification document, but not in the JSON-schemas.)
* 2025-05-16: Add `renderRequirements` property to Graphics manifest
* 2025-05-16: Add `data` argument to the `load` method.
  Before, the `data`-payload was only sent using the `updateData()` method. Now it must be sent on `load()` as well.
* 2025-05-16: Change return values of Graphic methods to optionally be `undefined`.
  (An `undefined` value should be treated as `{ code: 200 }`)
