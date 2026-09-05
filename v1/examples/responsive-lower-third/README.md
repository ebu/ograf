# Responsive Lower Third

An OGraf v1 real-time lower third that adapts to landscape, square, and portrait output without
requiring renderer-specific attributes or CSS custom properties.

## Responsiveness

The graphic uses `renderCharacteristics.resolution` during `load()` and observes the size of its
custom element while it is mounted. A renderer only needs to size the element to its output; the
graphic selects its landscape, compact, or portrait layout automatically.

## Step model

The manifest declares one stable step. The first `playAction()` transitions from the hidden start
state to step 0. A subsequent play, or `playAction({ goto: 1 })`, transitions to the hidden end
state. `stopAction()` can be used to hide it directly.

`updateAction()` accepts partial updates for `name`, `title`, and `channel`. The finite play, update,
and stop animations resolve before the corresponding action promise completes.

## Package contents

The manifest, JavaScript module, and thumbnail form a self-contained OGraf package. Backgrounds,
device frames, and player controls shown on the website are presentation concerns and are not
included.
