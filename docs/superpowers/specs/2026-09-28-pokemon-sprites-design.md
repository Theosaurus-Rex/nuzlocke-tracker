# Pokémon sprites

Decided 2026-09-28. Linear PER-56.

## Why

Every hi-fi frame that shows a mon shows its sprite. The app shows none. The route table, the
phone route cards and the party cards were all built without the sprite.

## Decisions

**Licence, decided 2026-09-28.** Theo has cleared showing sprites hosted by the PokéAPI project.
The sprite repository is CC0, but its licence file states the images are copyright The Pokémon
Company. So the app loads them from PokéAPI's host at runtime and never commits a copy.

**Sprite set: Showdown, decided 2026-09-28.** PokéAPI carries Pokémon Showdown's fan-made sprites
(`sprites.other.showdown`). They are in the Black/White pixel style for every generation, which
matches the frames. The standard sprites are Black/White pixel art only up to Gen 5. After that
they are smooth renders, and PokéAPI's Gen 6+ "black-white" files are byte-for-byte copies of
them. HeartGold sprites stop at Gen 4.

Showdown sprites are animated GIFs, 40 to 60 frames, around 20 to 60 KB each, cropped to the mon
at varying sizes. A viewer whose device asks for reduced motion gets the still standard sprite
(`front_default`) instead. That is the only place the smooth renders appear.

**No offline work.** The live-PokéAPI design already dropped offline use. The browser HTTP cache
serves repeat sprites, as it does for the JSON.

## Behaviour

### Data

`toSpecies` in `src/game/pokeapi/map.ts` reads four sprite addresses from the `/pokemon/{name}`
response that `useSpecies` already fetches, and the `Species` model carries them:

| Field | Source |
|---|---|
| `animated` | `sprites.other.showdown.front_default` |
| `animatedShiny` | `sprites.other.showdown.front_shiny` |
| `still` | `sprites.front_default` |
| `stillShiny` | `sprites.front_shiny` |

Each is `string | null`. A missing `sprites`, `other` or `showdown` object maps to `null` rather
than throwing. No new request and no new query.

### The component

`SpeciesSprite` in `src/components/species-sprite.tsx` takes `speciesId: string | null`,
`shiny: boolean` and `size`, which is the box's edge in px.

- It picks the shiny pair when `shiny` is true, otherwise the normal pair. A shiny mon whose
  species has neither shiny sprite falls back to the normal pair rather than the placeholder.
- It renders a `<picture>`. When a still sprite exists, a
  `<source media="(prefers-reduced-motion: reduce)">` points at it. The `<img>` shows the animated
  sprite, or the still one when there is no animated sprite.
- The image sits in a fixed square box, centred and scaled to fit (`object-contain`), with
  `image-rendering: pixelated`, `loading="lazy"` and `alt=""`. The mon's name is always beside it,
  so the sprite is decorative.
- It shows the placeholder while the species loads, when the species fetch fails, when neither
  sprite exists, and when the image fails to load (the `<img>` `error` event). It also shows it
  when `speciesId` is null.
- The placeholder is the same box with a dashed `1.5px` border in the placeholder token, as
  `docs/design/block-shadow.md` specifies for a missing sprite.

### Where it appears

The sprite follows the mon's current `speciesId` and its `shiny` flag. A row without a mon uses the
encountered species and is never shiny.

- **Route table (`5a`).** A small sprite at the start of the encounter cell, on caught, dead and
  missed rows. It is faded on missed, fainted and skipped rows, on both the table and the phone
  cards, since none of those mons is on the team. Not-encountered and open rows show no sprite,
  since their text already says so.
- **Phone route cards (`6c`).** A sprite in a left column on every card. Not-encountered and open
  cards show the placeholder, as the pending row in `6c` does.
- **Party cards (`5b`, `6e`).** A larger sprite breaking out of the card's top-right corner. The
  card is positioned so the sprite can overlap its top border. The title and the line under it
  keep right padding, so a long nickname never runs under the sprite at 390px.

Box sizes follow the frames: about 32px in the table, 40px on phone cards and 80px on party
cards. The exact values are the plan's to set from the frames.

## Tests

- Mapping: all four addresses map. A response missing `other.showdown`, or missing `sprites`,
  maps to `null`s without throwing.
- Component: a shiny mon gets the shiny animated address, and the reduced-motion source gets the
  shiny still one. With no animated sprite the image falls back to the still one. There is no
  reduced-motion source when no still sprite exists. The placeholder shows while pending, on a
  failed fetch, with no sprite at all, and after the image's `error` event.
- Screens: a caught row and a party card each render a sprite. A missed row's sprite is faded. A
  not-encountered phone card shows the placeholder.
- The PokéAPI fixtures in `src/test/pokeapi-fixtures.ts` gain `sprites` objects, including one
  species with no Showdown sprite.

Each guarantee is checked by breaking the code and watching its test fail. The breaks include
ignoring `shiny`, dropping the reduced-motion source, and not handling the image error.

jsdom does not evaluate media queries or load images. The tests check the markup, meaning which
address goes where. Whether a browser honours reduced motion is a manual check, stated in the PR.

## Out of scope

- Boxes, graveyard and the run-list strip. They reuse `SpeciesSprite` when those screens are
  built.
- Type icons inside the party card's move dots.
- Committing images, a service worker, or any offline caching.
- Letting the viewer choose a sprite set.
