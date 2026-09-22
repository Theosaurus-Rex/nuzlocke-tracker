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

| Token | Hex | oklch | Used for |
|---|---|---|---|
| ink | `#141414` | `oklch(0.191 0.000 89.9)` | every border, every rule, all body text, every shadow |
| paper | `#FBF9F4` | `oklch(0.982 0.007 88.6)` | app background and header strips |
| grid | `#E8E4D8` | `oklch(0.919 0.017 91.6)` | neutral chips, inactive fills, row dividers |
| alert | `#C8351F` | `oklch(0.552 0.187 31.5)` | dead, failed, over cap, destructive |
| go | `#2F9E6D` | `oklch(0.625 0.124 159.9)` | caught, in party, cleared, active, primary action |
| flag | `#F4C531` | `oklch(0.842 0.160 89.7)` | pending, needs attention, the log affordance |

Unnamed on the sheet but load-bearing in the frames:

| Hex | oklch | Used for |
|---|---|---|
| `#6A6A6A` | `oklch(0.524 0.000 89.9)` | secondary text, the second most used colour in the canvas after ink |
| `#FFFFFF` | `oklch(1.000 0.000 89.9)` | card surfaces, which sit on paper rather than matching it |
| `#C9C4B6` | `oklch(0.820 0.020 90.6)` | empty-slot and placeholder borders, usually dashed |
| `#D5D0C3` | `oklch(0.858 0.019 89.4)` | empty-slot and placeholder borders, usually dashed |
| `#FDF6DE` | `oklch(0.972 0.032 93.5)` | a pale flag tint, the row background for a route awaiting an encounter |

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
  `4px 4px 0` and `5px 5px 0` raise a card, and the modal takes `8px 8px 0`.
- There is no `6px` shadow in the app. The `6px` offsets in the canvas belong to the phone
  outline drawn around each mobile frame, not to anything inside it.
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
use; the other eight are not drawn.

Drawn, measured off the canvas:

| Type | Hex | oklch | Type | Hex | oklch |
|---|---|---|---|---|---|
| WATER | `#7FC4EE` | `oklch(0.790 0.092 236.3)` | POISON | `#C79AE0` | `oklch(0.752 0.109 313.1)` |
| GRASS | `#9BD46E` | `oklch(0.808 0.146 132.8)` | GHOST | `#A892C9` | `oklch(0.699 0.082 302.6)` |
| ELECTRIC | `#F4C531` | `oklch(0.842 0.160 89.7)` | BUG | `#B8C94A` | `oklch(0.799 0.151 116.4)` |
| NORMAL | `#E8E4D8` | `oklch(0.919 0.017 91.6)` | FLYING | `#C5D8EE` | `oklch(0.875 0.037 252.1)` |
| ROCK | `#D4BD85` | `oklch(0.805 0.078 88.2)` | GROUND | `#E0A878` | `oklch(0.773 0.092 61.4)` |

ELECTRIC and flag are the same yellow, so an electric type badge and a PENDING chip cannot be
told apart by colour. That is fine as drawn, because they never share a row, but it matters if
the token is reused elsewhere.

Not drawn, built to match:

| Type | Hex | oklch |
|---|---|---|
| FIRE | `#FE9979` | `oklch(0.780 0.130 38.0)` |
| FIGHTING | `#E7827F` | `oklch(0.715 0.125 22.0)` |
| PSYCHIC | `#F595BD` | `oklch(0.780 0.125 354.0)` |
| FAIRY | `#F6BBDC` | `oklch(0.855 0.080 344.0)` |
| DRAGON | `#909EEC` | `oklch(0.720 0.115 275.0)` |
| ICE | `#96E2E3` | `oklch(0.865 0.075 196.0)` |
| STEEL | `#AFB9C3` | `oklch(0.780 0.018 250.0)` |
| DARK | `#AB9385` | `oklch(0.680 0.035 52.0)` |

These eight sit in the same family as the ten drawn colours, `L` 0.68–0.88 and `C` 0.018–0.160,
at the conventional hue for each type. Every pair separates better than GRASS/BUG, the closest
pair among the drawn ten, and ink text clears WCAG AA on all eighteen, worst case DARK at 6.35:1.

## The mobile shadow contradiction

The direction sheet `3c` states: "On mobile the shadow drops to 2px and cards go edge-to-edge."

The drawn mobile frames do not do this. `6a`–`6i` use `3px 3px 0` and `4px 4px 0`, the same as
desktop, and there is no `2px` shadow anywhere in the canvas. The `6px` shadows on the mobile
frames belong to the phone outline drawn around them, not to the app inside.

Build to the frames and keep `3px` on mobile. The frames are the later artefact.

## Not decided

- **Empty states.** Only the empty party slot is drawn.
- **Motion.** Nothing in the canvas describes a transition, a hover or a press state.

## Removed

- **Dark mode.** This app never sets the `dark` class, so it was dead code carrying stock
  shadcn values that no longer related to anything. The `.dark` block, the `dark` custom
  variant, and every `dark:`-prefixed utility in the vendored components are gone.
