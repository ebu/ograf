# Tennis Scoreboard

A responsive OGraf v1 real-time tennis scoreboard. Where the [Scoreboard](../scoreboard/)
example shows a fixed five-step football match, this one exercises the parts of the
specification that a variable-length, serve-based sport needs: a **dynamic step count**,
**per-step action durations**, a boolean serve indicator, tie-break point counting, and
custom actions in both their parameterless and parameterised forms.

The Graphic takes its state exclusively from the `data` passed to `load()` and
`updateAction()`. It contains no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no
external font or image reference, and no API key field, so it renders complete from
the manifest's schema defaults in an offline renderer.

## Step model

Tennis has no fixed number of phases: a best-of-three match is a different length from a
best-of-five one, and neither is known before the match. The manifest therefore declares
`stepCount: -1` (dynamic), and the Graphic derives its own step sequence from the `bestOf`
data field:

| Step | Phase | Shown |
| ---: | --- | --- |
| 0 … `bestOf` - 1 | Set in play | The full bug: sets, games, points, serve, pressure badge |
| `bestOf` | Result | Final set score and the winner |

So a best-of-three match has four steps and a best-of-five match has six. Step 0 is the
live scoreboard for the first set, which means a renderer that simply plays the Graphic
gets the scoreboard rather than an intermediate card. Use `playAction({ delta: 1 })` to
advance, or `playAction({ goto: step })` to select a step. A target step at or beyond the
current count transitions the Graphic to its hidden end state, as does `stopAction()`.

The step selects what the Graphic presents; the data carries the score. A set that is
never played (step 2 of a match won 2–0) is simply never used.

The website demo provides Previous view and Next view buttons and a Match format
selector (applied with Update). Switching from best of five to best of three clamps
the current view to the shorter sequence's result if necessary.

## Score model

| Field | Meaning |
| --- | --- |
| `setsA` / `setsB` | Completed sets won |
| `gamesA` / `gamesB` | Games won in the set in play |
| `pointsA` / `pointsB` | Rally points won in the game in play |
| `playerAServing` | `true` when player A serves, `false` when player B serves |
| `tiebreak` | `true` while the game in play is a tie-break |

`pointsA` and `pointsB` are rally counts rather than display strings, because the same
number is rendered two different ways:

- in a normal game as `0`, `15`, `30`, `40` or `AD`, with deuce handled as it is on court
  (3–3 shows 40–40, 4–3 shows AD–40, 4–4 returns to 40–40);
- in a tie-break as the running count itself, which is why the value is not constrained
  to a five-value enum.

The **break point** badge is derived, not supplied: the receiver holds a break point when
they have at least 40 and are ahead of the server. In a tie-break the same badge becomes a
set point at six points or more with the lead. Deriving it means an operator cannot leave
the badge contradicting the score.

Only `eventLabel`, `playerAName` and `playerBName` are left visible to GUI labelling; the
remaining properties are marked `hidden: true` so a controller that builds a name for the
Graphic from its data produces "Centre Court · Quarter-Final A. Moreau J. Lindqvist"
rather than a string of loose digits.

## Custom actions

| Action | Payload | Effect |
| --- | --- | --- |
| `point-server` | none | Award the point to the player serving |
| `point-receiver` | none | Award the point to the player receiving |
| `award-game` | `{ "player": "a" \| "b" }` | Award the game in play |
| `award-set` | `{ "player": "a" \| "b" }` | Award the set in play |

The two point actions are parameterless (`schema: null`) so a controller can bind them to
single buttons. The two award actions carry a GDD schema, which is the same mechanism the
manifest uses for `data`, so a controller can generate a payload form for them. Calling an
award action without a player returns `statusCode: 400`, as does an unknown action id.

Points cascade the way they do on court. A point that wins the game resets the points,
adds the game and hands over the serve; a game that wins the set adds the set and resets
the games; 6–6 starts a tie-break, inside which the serve changes after the first point
and then every two points, and whoever received its first point serves first in the next
set. So calling `point-server` twice in a tie-break gives one point to each player.

A tie-break can also be loaded or corrected midway through: its first server is
reconstructed from the total points played and the current server. The website's
rally-point fields follow custom actions, including counts above four during deuce
or a tie-break; changing a player's name does not restore an earlier score.
Update sends only edited fields, so a name change also preserves points awarded
while a custom-action animation is still running. Editing a score field explicitly
still corrects that score.

`playAction()` and the custom actions resolve to a `result` object carrying the public
state plus `currentStep`, `stepCount`, and the derived `setInPlay`, `matchWinner`
and `matchComplete`, which lets an automation system decide when to step to the result.

## Action durations

`actionDurations` declares a `playAction` duration of 400 ms with a step-specific 620 ms
for step 0, because the board establishes itself when it first reaches set one, while
later steps are quicker transitions between sets and the result. The duration depends
only on the target step, so the declared values hold whether the Graphic is animating in
or stepping while already visible. The remaining action durations match the CSS animations
in `graphic.mjs`.

## Driving the fields

The Graphic is a presentation layer, so the score has to arrive from somewhere. Any of
these works, and none of them changes the Graphic:

- a manual rundown or operator panel, using `updateAction()` for the score and the custom
  actions for points, games and sets;
- an automation system already carrying scores, mapping its own fields onto this schema;
- a live scores feed — for example [Sportradar](https://sportradar.com/),
  [Infosys ATP](https://www.atptour.com/) data for ATP events, or
  [Live Tennis API](https://livetennisapi.com/) — with a small adapter in the controller
  that translates feed updates into `updateAction()` calls.

Keeping the fetching in the controller is what allows the Graphic itself to stay offline
and dependency-free.

## Package contents

The manifest, the JavaScript module and the thumbnail form a self-contained OGraf package.
The tennis court behind the score is a backdrop for the thumbnail and the website demo
only. It is not part of the Graphic, which renders transparently over whatever the
renderer puts behind it.
