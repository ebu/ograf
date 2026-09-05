# Live Scoreboard

A responsive OGraf v1 real-time scoreboard. It demonstrates the standard OGraf step model,
partial data updates, and parameterless custom actions.

## Step model

The manifest declares five stable steps:

| Step | Match phase |
| ---: | --- |
| 0 | Pre-Match |
| 1 | Live |
| 2 | Half-Time |
| 3 | Second Half |
| 4 | Full-Time |

Use `playAction({ delta: 1 })` to advance or `playAction({ goto: step })` to select a phase.
A target of 5 or greater transitions the graphic to its hidden end state. `stopAction()` also
hides the graphic without clearing its public data.

## Custom actions

- `goal-home` increments `homeScore` by one.
- `goal-away` increments `awayScore` by one.

Both actions have `schema: null` and therefore require no payload data.

## Package contents

The manifest, JavaScript module, and thumbnail form a self-contained OGraf package. The stadium
image and player controls shown on the website are presentation concerns and are not included.
