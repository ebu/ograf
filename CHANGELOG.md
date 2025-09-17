# Changelog

This log lists changes between versions.




## Version 1

The log below details the changes during development of this version:

* 2025-03-27: Draft 0 made public.
* 2025-04-23: Fix in JSON-schemas: Changed `main` property in Graphics manifest to be **mandatory**.
  (Before, it was defined as mandatory in the specification document, but not in the JSON-schemas.)
* 2025-05-16: Add `renderRequirements` property to Graphics manifest
* 2025-05-16: Add `data` argument to the `load` method.
  Before, the `data`-payload was only sent using the `updateData()` method. Now it must be sent on `load()` as well.
* 2025-05-16: Change return values of Graphic methods to optionally be `undefined`.
  (An `undefined` value should be treated as `{ statusCode: 200 }`)
* 2025-06-09: Rename the "v1-draft-0" to "v1" in preparation for the first release.
* 2025-06-13: Add requirement on manifest file name.
  The manifest file must now have the suffix `".ograf"`.
  Before, there where no requirements on the manifest file name.
* 2025-06-13: Add optional `skipAnimation` argument to `updateAction` and `customAction`.
  Before, it was only included in `playAction` and `stopAction`.
* 2025-07-02: Change requirement on manifest file name.
  The manifest file must now have the suffix `".ograf.json"`.
  Before, it was `".ograf"`.
