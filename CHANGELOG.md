# Changelog

This log lists changes between versions.




## Version 1

### Non-breaking changes in version 1:

* 2026-02-09: [PR 12](https://github.com/ebu/ograf/pull/12): Publish first draft of the **OGraf Server API**. Note: Breaking changes might be introduced to the Server API while it is a draft.
* 2026-02-04: [PR 40](https://github.com/ebu/ograf/pull/40): Move over GDD Definitions to OGraf repo.
* 2026-01-21: [PR 39](https://github.com/ebu/ograf/pull/39): Add optional `skipAnimation` property to `updateAction()` & `customAction()` in specification.md, to align with the other actions / typescript types.
* 2026-01-21: [PR 38](https://github.com/ebu/ograf/pull/38): Add definitions of the returned Promise for `updateAction()` and `customAction()`, to align with the preexisting actions.
* 2025-11-07: [PR 17](https://github.com/ebu/ograf/pull/17): Modify the `stepCount` property, to include the value -1 to signify that a Graphic does have steps, but the number of steps is not known on beforehand.
* 2025-11-07: [PR 19](https://github.com/ebu/ograf/pull/19): Documentation improvements regarding the step model.
* 2025-11-07: [PR 34](https://github.com/ebu/ograf/pull/34): Clarification of Web Component Interface specification


### Pre-Version 1:

The log below details changes during development of Version 1:

* 2025-09-17: **Version 1 published and considered stable**
* 2025-07-13: [PR 21](https://github.com/ebu/ograf/pull/21): Change requirement on manifest file name.
  The manifest file must now have the suffix `".ograf.json"`.
  Before, it was `".ograf"`.
* 2025-06-13: Add optional `skipAnimation` argument to `updateAction` and `customAction`.
  Before, it was only included in `playAction` and `stopAction`.
* 2025-06-13: Add requirement on manifest file name.
  The manifest file must now have the suffix `".ograf"`.
  Before, there where no requirements on the manifest file name.
* 2025-06-09: Rename the "v1-draft-0" to "v1" in preparation for the first release.
* 2025-05-16: Change return values of Graphic methods to optionally be `undefined`.
  (An `undefined` value should be treated as `{ statusCode: 200 }`)
* 2025-05-16: Add `data` argument to the `load` method.
  Before, the `data`-payload was only sent using the `updateData()` method. Now it must be sent on `load()` as well.
* 2025-05-16: Add `renderRequirements` property to Graphics manifest
* 2025-04-23: Fix in JSON-schemas: Changed `main` property in Graphics manifest to be **mandatory**.
  (Before, it was defined as mandatory in the specification document, but not in the JSON-schemas.)
* 2025-03-27: Draft 0 made public.
