# Block Shadow

The visual direction, decided 2026-09-22. Hairline black borders, hard offset shadows, three
loud accents.

Four directions were drawn from the mood board and Block Shadow won. Every screen drawn after
that point is in it. The other three survive only as history: `3a` DMG (Game Boy greyscale),
`3b` Pixel Field (dusty blue on cream), `3d` Terminal (near-black with one electric accent).

Everything below is measured out of the canvas markup, not eyeballed from a PNG. Prefer these
numbers to whatever a screenshot looks like at your zoom level.

The same reference is on the Linear project as the document "Block Shadow — visual direction",
which links back here. This file is the one to correct.

## The frames

| Frames | What |
|---|---|
| `3c` | the direction sheet: palette, type specimens, component chips |
| `4a` | party, box and detail cards |
| `5a`–`5i` | desktop, 942×629, on the sidebar shell |
| `6a`–`6i` | mobile, 340×715 |

All under `docs/wireframes/hifi/frames/`. `docs/wireframes/README.md` maps each one to its screen.

## Palette

The six tokens the direction sheet names.

| Token | Hex | Used for |
|---|---|---|
| ink | `#141414` | every border, every rule, all body text, every shadow |
| paper | `#FBF9F4` | app background and header strips |
| grid | `#E8E4D8` | neutral chips, inactive fills, row dividers |
| alert | `#C8351F` | dead, failed, over cap, destructive |
| go | `#2F9E6D` | caught, in party, cleared, active, primary action |
| flag | `#F4C531` | pending, needs attention, the log affordance |

Unnamed on the sheet but load-bearing in the frames:

| Hex | Used for |
|---|---|
| `#6A6A6A` | secondary text, the second most used colour in the canvas after ink |
| `#FFFFFF` | card surfaces, which sit on paper rather than matching it |
| `#C9C4B6`, `#D5D0C3` | empty-slot and placeholder borders, usually dashed |
| `#FDF6DE` | a pale flag tint, the row background for a route awaiting an encounter |

## Type

Two families, no third.

- **Space Grotesk** for headings and all UI. Weights 400, 500 and 700. Sizes 9, 10, 11, 12, 13,
  14, 15, 16 and 19px.
- **Share Tech Mono** for every number: levels, counters, badge counts, route tallies, the
  `24/31` progress figures.

"Every number" is the rule as drawn, and honouring it precisely is most of what makes the
direction read the way it does.

Uppercase labels, meaning section eyebrows and chips, are `500 9px` or `500 10px` with
`letter-spacing` between `.12em` and `.14em`.

Bundle both faces with the build rather than linking Google Fonts. Offline-first is the reason
this app has no backend, and a webfont fetched from a CDN is a screen that renders in a fallback
face on a phone mid-run with no signal.

## Borders and shadows

- The hairline border is `1.5px solid #141414`. Not 1px, not 2px. The canvas uses it 419 times
  against 9 uses of `2px`.
- Corners are square everywhere. shadcn/base-nova defaults to rounded, so this is an override.
- The shadow is a hard offset with no blur and no spread. `3px 3px 0 #141414` is the default.
  `4px 4px 0` and `5px 5px 0` raise a card, `6px 6px 0` the largest surfaces.
- An alert surface takes the same shadow in alert: `4px 4px 0 #C8351F`, `5px 5px 0 #C8351F`.
- Dashed `1.5px` in `#C9C4B6` or `#D5D0C3` marks an empty slot or a missing sprite.
- Row dividers inside a card drop to `1px solid #E8E4D8`, not the hairline ink used on card edges.

## Status chips

One shape throughout: uppercase, `font: 500 9px` Space Grotesk, `letter-spacing: .12em`,
`padding: 3px 7px`, `border: 1.5px solid #141414`, square, no shadow.

| Chip | Background | Text |
|---|---|---|
| CAUGHT, PARTY, ACTIVE, CLEARED | `#2F9E6D` | white |
| FAINTED, FAILED, OVER CAP | `#C8351F` | white |
| PENDING, LOG, TRAINER, WILD | `#F4C531` | `#141414` |
| BOXED, COMPLETE, rule clauses | `#E8E4D8` | `#141414` |
| MISSED | white | `#141414` |

MISSED is white rather than grid so it reads as absence rather than as a neutral state.

## Type badges

The same chip shape with its own fills. The canvas only draws the types its mock data happens to
use, so this is a partial set and the remaining eight need choosing when the badge is built.

| Type | Hex | Type | Hex |
|---|---|---|---|
| WATER | `#7FC4EE` | POISON | `#C79AE0` |
| GRASS | `#9BD46E` | GHOST | `#A892C9` |
| ELECTRIC | `#F4C531` | BUG | `#B8C94A` |
| NORMAL | `#E8E4D8` | FLYING | `#C5D8EE` |
| ROCK | `#D4BD85` | GROUND | `#E0A878` |

ELECTRIC and flag are the same yellow, so an electric type badge and a PENDING chip cannot be
told apart by colour. That is fine as drawn, because they never share a row, but it matters if
the token is reused elsewhere.

## The mobile shadow contradiction

The direction sheet `3c` states: "On mobile the shadow drops to 2px and cards go edge-to-edge."

The drawn mobile frames do not do this. `6a`–`6i` use `3px 3px 0` and `4px 4px 0`, the same as
desktop, and there is no `2px` shadow anywhere in the canvas. The `6px` shadows on the mobile
frames belong to the phone outline drawn around them, not to the app inside.

Build to the frames and keep `3px` on mobile. The frames are the later artefact.

## Not decided

- **Empty states.** Only the empty party slot is drawn.
- **Dark mode.** Not drawn and never discussed. There is no dark palette.
- **Motion.** Nothing in the canvas describes a transition, a hover or a press state.
- **The remaining eight type colours.**
