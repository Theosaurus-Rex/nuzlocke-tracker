# Party screen

Decided 2026-09-27. Linear PER-15.

## Why

The party screen is a placeholder heading. Every later party interaction (reorder, add from box,
log a death, level caps) needs a real party view to build on.

## Decision

Build the party to the hi-fi frames `5b` (desktop) and `6e` (mobile). Every card is always
fully open. The ticket's "expandable rows" come from lo-fi `2c`, and hi-fi wins where they
disagree.

The hi-fi cards leave out caught location, which the ticket asks for. It goes on the footer line
beside held item and ability, so the card keeps the hi-fi shape.

## Behaviour

### The screen

- Shows the run's mons with `status === "party"`, ordered by `partySlot`. Box and dead mons never
  appear. A party with gaps in its slots, the state every death leaves, still orders correctly.
- The header is the shared `ScreenHeader` titled "Party", with "N of 6" beneath it.
- One column on phone, two on desktop.
- While the queries load it renders the header and no cards, as the routes screen does.
- With no party mons it shows one line, "No one in your party yet". PER-23 designs empty states
  properly later.
- A missing `runId` redirects to `/`, the same as the routes screen.
- Generation comes from `GAMES[run.game].generation`, falling back to HeartGold while the run
  loads, the same as the routes screen.

### The card

A `Surface` card, top to bottom:

1. Type badges, from the existing `SpeciesTypeBadge`, so dual types show both.
2. The nickname in quotes and caps. With no nickname, the species name in the same style.
3. A muted line: species · gender symbol · `L{level}` · nature. A missing gender or nature is left
   out, with its separator, rather than shown blank.
4. A rule, then the moves in a two-by-two grid. A mon with fewer than four moves shows only the
   moves it has.
5. A rule, then the footer: held item · ability · caught route.
   - No held item reads "no item", as `5b` draws it.
   - A missing ability is left out.
   - The caught route is the name of the route row matching `caughtRouteId`, from `useRoutes`.
     With no `caughtRouteId` (starters and gifts) or no matching row, it is left out.

No sprite. The frames place one over the card's top-right corner. PER-56 adds sprites, and a
dashed placeholder on every card would look broken rather than pending.

### Move icons

Each move shows a small circle in its type's colour, then the move's name.

- The type comes from `useMove(name)` resolved through `moveStatsIn(move, generation)`, so a move
  whose type changed across generations shows the type for the game being tracked.
- While loading, on an error, or when the type is `unknown`, the circle is neutral. The name
  always shows.
- The frames draw a glyph per type inside the circle. There is no glyph set, so the circle is
  plain for now. Glyphs belong with PER-56's image work.

## Structure

| File | Does |
|---|---|
| `src/features/party/party-screen.tsx` | Queries, filtering, ordering, header, grid, empty state |
| `src/features/party/party-card.tsx` | One mon's card |
| `src/features/party/move-chip.tsx` | Type circle plus move name |
| `src/components/type-badge.tsx` | Exports its type-to-colour map for `move-chip` to share |
| `src/lib/gender.ts` | `genderSymbol`, moved out of `route-presentation.tsx` so two features share it without importing each other |

Ordering and filtering are one small pure function in `party-screen.tsx`, exported for its test.

Names display through the existing `speciesDisplayName` and `moveDisplayName`.

## Tests

- Screen: shows only party mons and ignores box and dead ones. Orders by slot when slots have gaps
  (0, 2, 5) and when stored out of order. Shows "N of 6". Shows the empty line with no party.
- Card: renders with no nickname, no gender, no nature, no item, no ability and no caught route,
  leaving no stray separators. Shows the caught route's name in the footer.
- Move chip: colours by the type resolved for the tracked generation, not the present-day type.
  Neutral on a failed fetch, with the name still shown.

Each guarantee is checked by breaking the code and watching its test fail: dropping the status
filter, sorting by `createdAt` instead of `partySlot`, and resolving move type without the
generation.

## Out of scope

- Over-cap badges and the cap in the header: PER-40.
- Empty slots and add from box: PER-17.
- Drag to reorder and drag to swap, and the hint bar under the grid: PER-17, PER-22.
- Sprites and type glyphs: PER-56.
- Editing a mon from its card.
