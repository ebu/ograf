# OGraf website

The website is published at <https://ograf.ebu.io/>. Node.js 24 or newer is required.
Serve it over HTTP; do not open `index.html` through `file://`.

## Develop and check the website

```bash
npm --prefix website/_tooling ci
npm --prefix website/_tooling run dev
npm --prefix website/_tooling run validate
npm --prefix website/_tooling test
```

The development server listens at `http://127.0.0.1:3000/`. It also exposes `/ograf/`
for checking relative URLs under a project preview path.

| Command | Purpose |
| --- | --- |
| `content:update` | Refresh generated example file lists/hashes and logo manifests |
| `validate` | Read-only checks of source, references, manifests and generated content |
| `test:unit` | Small tests of content workflows, paths, thumbnails and ZIP integrity |
| `test:browsers` | Website behaviour, accessibility and responsive layout |
| `test` / `test:ci` | Validation, unit tests and the lean browser matrix |
| `test:full` | Validation, unit tests and every browser/viewport project |
| `test:examples` | Separate detailed tests of the example implementations |

The website gate checks function and usability, not approved copy, exact CSS values,
company lists or the internals of individual graphics. Image-size budgets produce
warnings. Missing assets, broken controls and invalid downloads remain errors.

## Edit text, metadata or media

Edit the page's text and links directly. Social titles, descriptions and image URLs
must stay consistent between Open Graph and Twitter metadata. If the preview image
changes, update its declared dimensions and description too. The production domain,
indexability and documentation routes remain intentional website contracts.

Replace background/media references where they are used; filenames are not fixed by
the tests. Set the video ID on the consent embed; the video must still wait for consent
and use `youtube-nocookie.com`. Finish with `validate` and `test`.

## Change an existing example

Edit the complete package in `/v1/examples/<example-id>/`, including any assets and
manifest-declared thumbnails. Then refresh generated content:

```bash
npm --prefix website/_tooling run content:update
```

The `files` arrays and hashes in `website/demo-catalog.json` are generated; do not
maintain them manually. Titles, archive names and presentation settings are editorial
fields and are preserved. ZIPs are assembled in the browser from the actual package
bytes. Do not normalize bytes only while hashing: the browser checks those same bytes.

Website/example text uses LF on every platform (`.gitattributes` and `.editorconfig`).
If Windows reports stale hashes, first check the edited files' line endings. The
read-only validator neither rewrites files nor silently accepts different hashes.
Formatting-only changes to generated catalogue/logo-manifest JSON are accepted,
including indentation, object key order and CRLF. Changing package-file bytes still
requires `content:update`, even if only that package file's formatting changed.

The individual `update-demo-catalog` and `update-manifests` commands remain available.

## Add, remove or reorder a demo

1. Put the complete package in `/v1/examples/<example-id>/`: manifest, entry module,
   assets, README and a thumbnail supported by the website. Use a unique kebab-case ID.
2. Add its editorial entry to `website/demo-catalog.json`: `id`, `title`, `manifest`,
   `archiveName` and `presentation`. Use `viewport` or `fixed-canvas`; the latter needs
   positive canvas width/height. Optional `packageExtras` keep their existing format.
3. Add the corresponding hand-authored card and tab to `index.html`. A generic card
   uses `data-demo-controller`, `data-demo-action`, `data-demo-field` and
   `data-demo-custom-action` as in the existing cards. Give all DOM IDs unique values.
4. Keep the card's `data-example-id`, download's `data-example-download`, tab's
   `data-example-id` and iframe's `?example=` ID in agreement. Connect the tab and card
   through `aria-controls`/`aria-labelledby`. Cards and tabs must have the same order;
   the catalogue may use a different order.
5. Run `content:update`, `validate` and `test`. Check the thumbnail, deep link,
   play/update/stop/replay, download and both desktop/mobile views.

To remove a demo, remove its catalogue entry, card and tab. To reorder demos, move
cards and their tabs together. The demos section must retain at least one entry.
Before deleting package files, also update real users of that package: the device
showcase currently imports the responsive lower third independently of the carousel.
The scoreboard's specialised controller is optional when its whole card is removed;
a partial card is still a website error.

Content additions and removals do not require changing expected file lists, counts,
IDs or company names in tests. If a graphic's behaviour changes intentionally, its
separate `test:examples` checks may still need updating.

## Add, replace, rename or remove logos

Use the appropriate directory under `website/assets/img/vendor-logos/`:

- `hero/` for the single-colour vendor ticker;
- `vendors/` for the vendor grid;
- `organisations/` for the broadcaster grid.

Use descriptive filenames and optimized images, then run `content:update`. For grid
entries, set the correct display name and official URL in the generated manifest.
Existing names and URLs are preserved for unchanged files. After renaming a file,
review the new entry's name and URL. Run `validate` and check desktop/mobile rendering.

The ticker shuffles on each load. The grids sort by display name, ignoring case, and
use the filename as fallback. Manifest order and the number of logos are not fixed by
the tests.

## CI and failures

Linux CI verifies vendored assets, validates source, runs unit tests, builds Jekyll and
tests the generated website. Windows CI checks validation and unit tests against the
same LF checkout. Example-specific lifecycle tests are intentionally a separate command.
The full browser matrix can also be requested through the workflow's manual input.
Failed browser runs upload the HTML report, screenshots, videos and traces.

Automated tests cover observable function, layout bounds, keyboard operation and WCAG
rules. They do not replace a visual review of desktop and mobile before publication.
