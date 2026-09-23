# Live PokéAPI instead of a bundled pokedex

Decided 2026-09-23. Supersedes the "Game data" parts of
`2026-09-17-nuzlocke-scaffold-design.md` and CLAUDE.md that concern PokéAPI.

## Why

The app ships a copy of PokéAPI: `src/game/data/pokedex/`, about 34k generated lines. Two
problems with that:

- **Ownership.** Committing a copy of someone else's dataset carries licence and attribution
  questions we would rather not own.
- **Upkeep.** The generated files, the extract script and the bundle weight all cost something,
  and they buy nothing a live API does not.

Offline use is no longer a requirement, so fetching at runtime is acceptable.

## What stays the same

- **No backend.** Runs stay in IndexedDB behind the storage adapter. Hard rules 1–4 are
  untouched.
- **JSON export and import stay required.** iOS eviction threatens locally stored runs whatever
  happens to game data. Hard rule 5 stands as written.
- **HeartGold routes and fights** (`src/game/data/heartgold/`, from `nuzlocke.data`) stay
  bundled. They are a different source, hand-curated, and out of scope.
- **Types and move stats resolve per generation.** Clefairy is Normal in HeartGold. This now
  happens at runtime from PokéAPI's `past_types` and `past_values`.
- **Pickers search all generations** and take a selection, not free text.

## Decisions

- **Existing saved runs are not a constraint.** Nobody uses the app yet. No migration.
- **Romhack support is deferred.** Only PokéAPI species and moves can be picked. The
  hand-authored fakemon route in `species.ts` goes away with the file. A local layer for
  custom species can be added behind the same hooks when a romhack is actually started.
- **REST, not GraphQL or a wrapper library.** PokéAPI's GraphQL endpoint is beta with tighter
  limits. A wrapper adds a dependency and a second cache that competes with TanStack Query.
- **Natures and the type list stay as hand-written constants.** They are 25 and 18 fixed game
  facts, not a copied dataset, and fetching them only adds a loading state to a dropdown.

## Module shape

```
src/game/pokeapi/
  client.ts    fetchJson(path) against https://pokeapi.co/api/v2. Throws PokeApiError.
  map.ts       raw PokéAPI JSON → our Species / Move types, only the fields we use
  resolve.ts   pure typesIn(species, generation), moveStatsIn(move, generation)
  queries.ts   query keys and hooks
src/game/natures.ts
src/game/types.ts    (existing file; gains the Type constant list)
```

Components import hooks from `queries.ts` and pure helpers from `resolve.ts`. They never import
`client.ts` and never see a PokéAPI response shape. If PokéAPI renames a field, `map.ts` is the
only file that changes.

`src/game/pokeapi/` is not storage, so the Dexie import rule does not apply to it.

### Hooks

| Hook | Fetches | Returns |
|---|---|---|
| `useSpeciesIndex()` | `/pokemon?limit=100000`, filtered to id < 10000 | `{ id, name }[]` in dex order |
| `useSpecies(name)` | `/pokemon/{name}` | `Species` with `types` and `pastTypes` |
| `useMoveIndex()` | `/move?limit=100000` | `{ id, name }[]` |
| `useMove(name)` | `/move/{name}` | `Move` with `power`, `accuracy`, `pp`, `type`, `pastValues` |

Ids come from the trailing segment of each index entry's `url`.

**Why `/pokemon` and not `/pokemon-species`.** `/pokemon/{name}` is the only endpoint that
returns types and `past_types`. Indexing by species name would cost two requests per type
badge. The id < 10000 filter keeps default forms and drops megas, regional forms and the like.
It picks up a new generation without a code change.

The cost: some default forms carry a suffix, so the picker shows "Mimikyu Disguised". This is
today's behaviour and is left as is.

### Search

Filtering happens locally over the index, the same way it does now: case-insensitive prefix
match, spaces converted to hyphens, dex order. A fully typed name counts as choosing it.

### Mapping from today's module

| Now (`src/game/pokedex.ts`) | After |
|---|---|
| `searchSpecies(q)` | `useSpeciesIndex()` then local filter |
| `getSpeciesByName(n)` + `pokedexFor(g).typesOf(id)` | `useSpecies(n)` then `typesIn(species, g)` |
| `searchMoves(q)` / `getMoveByName(n)` | `useMoveIndex()` / `useMove(n)` |
| `getAllNatures()` | `natures` constant |
| `speciesDisplayName` / `moveDisplayName` | unchanged, moved to `resolve.ts` |
| `getEvolutions`, `getAbility*`, `getItemByName` | deleted. No callers outside tests |

## Caching

- Game data queries use `staleTime: Infinity` and `gcTime: Infinity`. Each resource is fetched
  once per session.
- Across sessions, the browser HTTP cache serves repeats. PokéAPI sends long cache headers.
- No persistence to disk. A query persister is a contained follow-up if first load proves slow.
- Two retries with backoff. A 404 is final and not retried.

This satisfies PokéAPI's fair-use request to cache locally.

## Loading and errors

| Where | Loading | Failed |
|---|---|---|
| Species and move pickers | List reads "Loading Pokémon…". Typing still works | "Couldn't reach PokéAPI" with Retry. Save stays blocked, since the species must be a selection |
| Type badges (route list, mon cards) | Blank placeholder the size of a badge, so rows do not jump | No badge. The species name still shows, since it is stored on the run |
| Natures dropdown | Constant, never loads | — |

**Guarantee:** creating a run, logging an encounter once a species is chosen, marking a death,
and export and import never wait on PokéAPI. Only choosing a species or move needs the network.

`PokeApiError` carries the HTTP status, or `"network"` for an offline or CORS failure. Hooks
expose TanStack's `isPending`, `isError` and `refetch`. No global error boundary.

## Testing

- `map.ts` and `resolve.ts` are pure. Unit tests use small hand-written fixtures: Clefairy's
  Gen 4 types, Vine Whip at 35 power in Gen 4 and 45 today. No bulk copies of PokéAPI responses,
  or the copied dataset returns through the test folder.
- `client.ts` and the hooks are tested by stubbing `fetch` with `vi.stubGlobal` and a small
  path-to-fixture router in `src/test/`. No MSW.
- Picker and badge component tests cover loading, loaded and failed.

Mutation probes, per CLAUDE.md. Each must turn the suite red:

- `past_types` resolution returns present-day types
- `past_values` resolution returns present-day stats
- the id < 10000 filter is removed
- a 404 is retried
- save is allowed while the species index is pending or failed

## Removal

- `src/game/data/pokedex/` (generated, excluded from the PR size count, called out in the PR)
- `src/game/pokedex.ts` and `src/game/pokedex.test.ts`
- `scripts/extract-pokedex.ts`

`heartgold/`, `scripts/extract-heartgold.ts`, `registry.ts` and `GameData.generation` stay.

## Docs, updated in the PR that dates them

- **CLAUDE.md "Game data":** PokéAPI is fetched at runtime and never copied into the repo.
  Romhack support deferred. The hand-authored fakemon route removed. Per-generation resolution
  kept.
- **CLAUDE.md "Why no backend":** reword the offline-writes rationale. Still no backend, but the
  app may need a connection. Hard rule 5 unchanged.
- **README:** the pokedex extract command, the structure block, any offline claims.
- **`2026-09-17-nuzlocke-scaffold-design.md`:** a note at the top pointing here for game data.

## Delivery

Two PRs, one Linear ticket each, in the Personal workspace. Each passes the full gate alone.

1. **Add the PokéAPI client.** `src/game/pokeapi/`, the natures and type constants, tests. Not
   wired into any screen. Nothing visible changes. Expected 400–500 lines.
2. **Switch to live PokéAPI and delete the bundled pokedex.** Pickers, badges and natures move
   to the new hooks with loading and error states. Old module, data and script deleted. Docs
   rewritten. Expected 400–600 lines excluding generated data. If it passes 500 during build,
   the deletion and docs split into a third PR.

## Out of scope

- Persisting the query cache to disk
- Romhack or custom species
- Replacing `nuzlocke.data` routes and fights
- Cleaner species display names than PokéAPI's default-form names
