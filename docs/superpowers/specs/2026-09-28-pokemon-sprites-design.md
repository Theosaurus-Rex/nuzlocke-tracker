# Pokémon sprites

Decided 2026-09-28. Linear PER-56.

## Why

Every hi-fi frame that shows a mon shows its sprite. The app shows none. The route table, the
phone route cards and the party cards were all built without the sprite.

## Decisions

**Licence, decided 2026-09-28.** Theo has cleared showing sprites hosted by the PokéAPI project.
The sprite repository is CC0, but its licence file states the images are copyright The Pokémon
Company. So the app loads them from PokéAPI's host at runtime and never commits a copy.

**Still pixel sprites, decided 2026-09-28.** The party cards show PokéAPI's standard sprite
(`front_default`, `front_shiny`). It is Black/White pixel art for every generation. Gen 1 to 5 are
the official Black/White sprites. Everything after #650 is Smogon's community Black/White-style
sprite, which PokéAPI serves with Smogon's permission. Smogon's own repository asks anyone else to
talk to them before using those, so loading them from PokéAPI keeps within the licence above.

This replaced an earlier choice of PokéAPI's `sprites.other.showdown` GIFs. That folder turned out
to be Pokémon Showdown's `ani` set, which is smooth renders of the 3D models, not pixel art. The
animated pixel set (`gen5ani`) is only on Smogon's own server and has no Gen 9. So the sprites do
not animate.

**Box icons on the routes screens, decided 2026-09-28.** The route table and phone route cards
show the small menu icon the games use in the party screen and the boxes, not the full sprite.
They come from PokéAPI's Gen 7 icon set (`versions["generation-vii"].icons`), the classic pixel
box icons on a tight 40×30 canvas, which cover Gen 1 to 7. Gen 8 species use the Gen 8 set
(`versions["generation-viii"].icons`) instead. That set also covers older species, but in newer,
smoother art on a padded 68×56 canvas, so it is only the second choice. PokéAPI has no pixel icons
for Gen 9, so those species fall back to the still sprite. PokéAPI has no shiny icons, and in-game box icons do
not show shininess either, so icons ignore `shiny`.

**No offline work.** The live-PokéAPI design already dropped offline use. The browser HTTP cache
serves repeat sprites, as it does for the JSON.

## Behaviour

### Data

`toSpecies` in `src/game/pokeapi/map.ts` reads three addresses from the `/pokemon/{name}` response
that `useSpecies` already fetches, and the `Species` model carries them:

| Field | Source |
|---|---|
| `still` | `sprites.front_default` |
| `stillShiny` | `sprites.front_shiny` |
| `icon` | `versions["generation-vii"].icons.front_default`, else the `generation-viii` one |

Each is `string | null`. A missing object anywhere on the way maps to `null` rather than throwing.
There is no new request and no new query.

### The component

`SpeciesSprite` in `src/components/species-sprite.tsx` takes `speciesId: string | null`,
`shiny: boolean`, `size` (the box's edge in px) and `variant: "sprite" | "icon"`, which defaults to
`"sprite"`.

- **Sprite.** It shows `stillShiny` for a shiny mon and `still` otherwise. A shiny mon whose species
  has no shiny sprite shows the normal one.
- **Icon.** It shows `icon`, then falls back to the still sprite, shiny or not, when there is no
  icon or the icon fails to load.
- An image that fails to load (the `error` event) is dropped, and the next address is tried. With
  none left, it shows the placeholder.
- It shows the placeholder while the species loads, when the species fetch fails, when there is
  no address at all, and when `speciesId` is null.
- The image sits in a fixed square box with `image-rendering: pixelated`, `loading="lazy"` and
  `alt=""`. The mon's name is always beside it, so it is decorative. A still sprite is scaled to
  fit (`object-contain`). An icon is drawn at 1x from the bottom of the box (`object-none
  object-bottom`). That keeps its pixels crisp, and it suits the Gen 8 icons, which sit low on a
  padded canvas.
- The placeholder is the same box with a dashed `1.5px` border in the placeholder token, as
  `docs/design/block-shadow.md` specifies for a missing sprite.

### Where it appears

It follows the mon's current `speciesId` and its `shiny` flag. A row without a mon uses the
encountered species and is never shiny.

- **Route table (`5a`).** A 40px icon at the start of the encounter cell, wherever the row has a
  species. It is faded on missed, fainted and skipped rows, on both the table and the phone cards,
  since none of those mons is on the team. Not-encountered and open rows show no icon, since
  their text already says so.
- **Phone route cards (`6c`).** A 40px icon in a left column on every card. Not-encountered and
  open cards show the placeholder, as the pending row in `6c` does.
- **Party cards (`5b`, `6e`).** An 80px still sprite breaking out of the card's top-right corner.
  The card is positioned so the sprite can overlap its top border. The title and the line under
  it keep right padding, so a long nickname never runs under the sprite at 390px.

## Tests

- Mapping: all three addresses map, the Gen 7 icon is preferred, and the Gen 8 one is used when
  there is no Gen 7 icon. A missing icon, a missing shiny sprite, a missing `versions`
  object and a missing `sprites` object all map to `null` without throwing.
- Component: the still sprite, the shiny one, and the normal one for a shiny mon with no shiny
  sprite. As an icon: the icon, the same icon when shiny, the still sprite when there is no icon or
  the icon fails, and the placeholder when both fail. The placeholder with no sprites, on a failed
  fetch, after the sprite's `error` event, and with no species.
- Screens: a caught row shows its current species' icon and a party card its sprite, shiny when
  the mon is. Missed and fainted rows are faded and a caught row is not. A not-encountered phone
  card shows the placeholder.

Each guarantee is checked by breaking the code and watching its test fail. jsdom does not load
images or lay anything out. The tests check which address goes where. How the icons sit in their
box is a manual check, stated in the PR.

## Out of scope

- Boxes, graveyard and the run-list strip. They reuse `SpeciesSprite` when those screens are
  built.
- Type icons inside the party card's move dots.
- Animation.
- Committing images, a service worker, or any offline caching.
- Letting the viewer choose a sprite set.
