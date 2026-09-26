# Block Shadow

The visual direction, decided 2026-09-22. Hairline black borders, hard offset shadows, three
loud accents.

Four directions were drawn from the mood board and Block Shadow won. Every screen drawn after
that point is in it. The other three survive only as history: `3a` DMG (Game Boy greyscale),
`3b` Pixel Field (dusty blue on cream), `3d` Terminal (near-black with one electric accent).

Everything below is measured out of the canvas markup, not eyeballed from a PNG. Prefer these
numbers to whatever a screenshot looks like at your zoom level.

## On desktop the app renders at 1.25 times these sizes

The desktop frames are drawn on a 940px canvas. Spread across a real desktop viewport those pixel
sizes read small, so from 768px up the app sets a root font size of 125% and every rem-based size
follows: type, control heights, padding, gaps. A size recorded here as 15px renders at about 19px.

**Below 768px the sizes are exactly as recorded.** The mobile frames are drawn at 340px wide with
the same type sizes, so a phone already reads at the right scale. Scaling it wraps the headers and
crowds the tab bar.

Three things deliberately do not follow:

- **Hairline borders stay `1.5px`.** A hairline is a hairline, and it is the measurement this
  direction is named after.
- **Shadow offsets were scaled once, by hand**, and the values in this file are the scaled ones.
  The canvas draws `3px`, the app uses `4px`.
- **Chip and eyebrow text is written in px**, because it sits below the type scale on purpose.
  The canvas draws 9px and 10px; the app uses 11px and 13px.

Tailwind's breakpoints are rem, so they are pinned to px in `src/index.css`. Without that, raising
the root would move the mobile shell's boundary from 768px to 960px.

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

It has bitten three times, so it is worth knowing what putting a number in its own element costs:

- **Inside a flex container the parent's `gap` opens up around it.** `12 CAUGHT` lost its space
  and read `12CAUGHT`; `Active (1)` gained two and read `Active ( 1 )`. Make the whole label one
  flex item.
- **Inside a sentence it splits the text across sibling nodes**, and Testing Library's default
  `getByText` reads only an element's own direct text children, so a query that matched the
  sentence stops matching. Use a function matcher against `textContent`.

Neither kind shows up in a test run. The first is layout, which jsdom does not evaluate, and the
second only surfaces once a query already exists.

Uppercase labels, meaning section eyebrows and chips, are `500 9px` or `500 10px` with
`letter-spacing` between `.12em` and `.14em`.

Bundle both faces with the build rather than linking Google Fonts. Offline-first is the reason
this app has no backend, and a webfont fetched from a CDN is a screen that renders in a fallback
face on a phone mid-run with no signal.

## Borders and shadows

- The hairline border is `1.5px solid #141414`. Not 1px, not 2px. The canvas uses it 419 times
  against 9 uses of `2px`.
- Corners are square everywhere. shadcn/base-nova defaults to rounded, so this is an override.
- The shadow is a hard offset with no blur and no spread. The app's default is `4px 4px 0
  #141414`, with `5px` and `6px` raising a card and `10px` on the modal. The canvas draws these
  one step smaller, at `3px`, `4px`, `5px` and `8px`, before the scaling described above.
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

## Components

The type scale and surfaces above are applied by components in `src/components/`, not by class
strings a screen has to remember. A screen should read as a tree of these.

### Typography

`<Typography variant="…" as="…">`. The `variant` sets the look and `as` sets the element, so an
`h2` can look like an eyebrow. Leave `as` out and each variant picks the element in the table.

| Variant | Element | Font | Weight | Size (phone · desktop) | Use for |
|---|---|---|---|---|---|
| `heading` | `h1` | Space Grotesk | 700 | 20px, 24px from 640px · 30px | the one title at the top of a screen |
| `title` | `h2` | Space Grotesk | 700 | 16px · 20px | the name on a card or panel |
| `body` | `p` | Space Grotesk | 400 | 14px · 17.5px | running text, form labels, list items |
| `strong` | `p` | Space Grotesk | 500 | 14px · 17.5px | the first line of a panel, such as "Import complete." |
| `caption` | `p` | Space Grotesk | 400 | 12px · 15px | hints and notes under a field |
| `eyebrow` | `span` | Space Grotesk | 500, uppercase, `.12em` | 13px at every width | section and field labels |
| `number` | `span` | Share Tech Mono | inherited | inherited | every number, inside whatever text holds it |

These are the sizes the app already rendered, so moving a screen onto them should change nothing
visible. A one-off size that does not match a row snaps to the nearest one, and the PR that moves
it says so.

`eyebrow` sets its own line height, the same ratio as `body`. The old hand-written label class
did not, so a label sat about 1px taller outside a dialog than inside one. Moving a label that
sits outside small text trims that pixel.

`tone` picks the colour from `ink`, `muted` and `alert`. Leave it out and the text inherits its
colour, except `eyebrow`, which is `muted` unless told otherwise.

`className` is for layout only: margins, flex, truncation. There is no size prop. A size passed in
`className` is dropped, because the variant's classes are merged last. A new size means a new
variant in `src/components/typography.tsx` and a new row here.

`number` sets only the face, so it takes the size and weight of the text around it. It is still
its own element, so the two costs listed under Type still apply. In a flex row, wrap the words and
the number together in one element so the row's `gap` sees a single item. In tests, match the
sentence with a function over `textContent`.

### Surface

`<Surface tone="card" | "alert">` draws the hairline border, the fill and the hard shadow. `card`
is white with the ink shadow. `alert` is a pale alert tint with the alert shadow. It renders a
`div` unless `as` says `section` or `li`. Padding and spacing go in `className`.

### ScreenHeader

`<ScreenHeader title="…" actions={…}>` is the strip across the top of every screen: a bottom
hairline, the `heading`, and anything in `actions` pushed to the right. Children go on a line
below the title, such as the persistence status on Settings.

### Why these three and no more

Counted on 2026-09-26 over the 32 screen and component files outside `components/ui/`:

- **Surface.** 7 panels spelled out the same border, fill and shadow by hand: 4 white cards and
  3 alert panels, plus 13 `shadow-block` classes in all.
- **ScreenHeader.** 9 screens start with an `h1`. 4 of them wrap it in the same hairline strip
  with the same classes, and the 5 placeholder screens will need it once they are built.
- **Eyebrow as a variant, not a SectionHeader.** The eyebrow label is used 31 times (28 through
  `FIELD_LABEL_CLASS`, 3 written out), but an eyebrow with a rule under it appears only once, on
  Settings. One use does not earn a component.
- **No Stack or Cluster.** 41 class strings pair `flex` with a `gap`, but they spread over 7
  gap sizes and mix direction, wrap, alignment and justify in many ways. `space-y-*` is used 14
  times across 5 sizes. Each is already one or two utilities, so a wrapper would rename Tailwind
  without taking a decision away from the screen.

### Lint

Enforced on migrated screens only. `no-restricted-syntax` in `eslint.config.js` bans raw `h1`–`h6`
and `p` elements, and arbitrary `text-[…]` sizes in a `className`, in the files it lists. Today
that is `src/features/settings/`. Each migration adds its screen to the list, and the last one
widens it to `src/features/**`.

Enforcing across the app now would fail lint on every screen not yet moved over, and turning it
on only at the end would let a screen that has already moved slide back in between. Listing
migrated screens keeps each one honest from the moment it moves. `label` and `span` are not
banned, because a plain `span` is still the right way to group words for a flex row.

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
