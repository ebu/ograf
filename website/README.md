# OGraf website

This is the website for OGraf. It is published at <https://ograf.ebu.io/>.

## Local development

Node.js 24 or newer is required. Serve the repository over HTTP instead of opening the
page through `file://`.

```bash
npm --prefix website/_tooling ci
npm --prefix website/_tooling run dev
npm --prefix website/_tooling run validate
npm --prefix website/_tooling test
```

The development server exposes the website at `http://127.0.0.1:3000/`.

## Add an example to the website

1. Add the complete OGraf package to `/v1/examples/<example-id>/`. Include its manifest,
   entry module, assets, README, and at least one manifest-declared thumbnail. Use a stable
   kebab-case ID.
2. Add a curated entry to `/website/demo-catalog.json` with its `id`, `title`, manifest
   path, ZIP filename, and presentation settings. Use `viewport` for responsive graphics
   or `fixed-canvas` with the package's canvas dimensions.
3. Do not edit the generated `files` array. Rebuild file entries and hashes with:

   ```bash
   npm --prefix website/_tooling run update-demo-catalog
   ```

4. Run `validate` and `test`, then check the new hero thumbnail, carousel player, controls,
   deep link, and downloaded ZIP locally.

ZIP downloads are generated in the browser from the current package files. No ZIP archive
is committed. Thumbnail dimensions are read from the OGraf manifest; 16:9 at about
1280 x 720 is recommended but not required. The selected hero thumbnail must remain below
500 KB.

## Add a logo

Choose the directory that matches where the logo should appear:

- `/website/assets/img/vendor-logos/hero/` for the single-colour hero ticker;
- `/website/assets/img/vendor-logos/vendors/` for the vendor grid; or
- `/website/assets/img/vendor-logos/organisations/` for the broadcaster grid.

Use a descriptive lowercase kebab-case filename and an optimized SVG where possible. After
adding, replacing, or removing a logo, run:

```bash
npm --prefix website/_tooling run update-manifests
```

For vendor and organisation entries, edit the generated `manifest.json` entry to provide
the correct display name and official URL. The generator preserves these fields on later
runs. Finish by running `validate` and checking both desktop and mobile layouts.
