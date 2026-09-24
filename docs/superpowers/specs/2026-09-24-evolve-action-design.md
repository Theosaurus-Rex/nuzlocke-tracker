# Evolve action

Decided 2026-09-24. Linear PER-37. Wireframes 5h (hi-fi) and 2g (lo-fi) place an Evolve button
beside the species field in the encounter dialog. Nothing is drawn for what happens after it is
clicked. This spec decides that.

## What it does

An evolve changes a mon's current species. It keeps where and as what the mon was caught, and
everything else about it.

`Mon` already has the two fields this needs. `speciesId` is the current species and changes on
evolve. `speciesIdCaught` is fixed at catch and never changes.

## Behaviour

**Where.** In the edit-mon dialog, beside the species field, on desktop and at phone width. It
does not appear when first logging a catch. A mon is caught as the species it is.

**What clicking Evolve offers.**

| Run | Species | Evolve shows |
|---|---|---|
| `rules.randomiser.evolutions` off | has next stages | a short list of its next stages |
| `rules.randomiser.evolutions` off | final stage, or no chain | no Evolve button |
| `rules.randomiser.evolutions` on | any | the normal all-species picker, in place of the species field |

- **Next stages only.** Bellsprout offers Weepinbell. Gloom offers Vileplume and Bellossom. Eevee
  offers every Eeveelution.
- **Every generation's evolutions are offered**, whatever the run's game. A HeartGold Meowth
  offers Perrserker. Romhacks can add later-generation evolutions to earlier games, and a filter
  would block them. This follows the rule that pickers are never constrained to one generation.
- **It can step again.** After picking Weepinbell, Evolve offers Victreebel. That covers catching
  up on an evolution the player forgot to log.

**Before saving.** Picking a species updates the species name and type badge in the form. A note
under the field reads "Evolved from Bellsprout" with an Undo link. Undo restores the species the
dialog opened with, however many steps were taken.

**Saving.** Nothing is written until Save encounter. Cancel discards the evolve with the rest of
the form. Save writes the new species together with any other edits in the same record.

**What changes on save.** `speciesId` only. `speciesIdCaught`, the caught route, level caught,
nickname and every other field keep their values unless the player edited them in the same form.

**No history is stored.** A mon knows what it was caught as and what it is now, not the stages in
between. If run stats or a timeline later want evolution events, that is a separate addition.

**When PokéAPI is unavailable.** While the chain loads, Evolve shows but is disabled. If it fails,
the button is replaced by the same "Couldn't reach PokéAPI." notice with Retry that the pickers
use. A randomised-evolutions run never needs the chain, so it works regardless.

## Data and code

### Domain

`evolveMon({ mon, speciesId }): Mon` in `src/domain/transitions.ts`. It sets `speciesId` and
leaves every other field as it was. It throws on an empty `speciesId`. It does not check that the
target is a real evolution. The domain holds no game data, and randomised runs allow anything, so
the UI owns that.

`MonAmendments` does not gain a species field. That keeps evolving separate from correcting a
wrongly logged species (PER-48), which rewrites both ids.

### Storage

`AmendMonInput` gains `evolvedTo?: string`. The mutation applies `amendMon`, then `evolveMon`
when `evolvedTo` is set, and writes one record. No new table, no schema change, no change to the
export format.

### PokéAPI

`useNextEvolutions(speciesName: string | null)` in `src/game/pokeapi/queries.ts`:

1. Looks the name up in the species index to get its id. Default forms share their id with their
   species, so `mimikyu-disguised` is 778 and species 778.
2. One query, keyed `["pokeapi", "evolutions", id]`, fetches `/pokemon-species/{id}`, follows its
   `evolution_chain.url`, and fetches the chain.
3. Returns the next stages as species index entries (`IndexEntry[]`), in chain order.

It picks up the PokéAPI cache, retry and offline defaults from its `"pokeapi"` key prefix.

`map.ts` gains `RawPokemonSpecies`, `RawEvolutionChain`, and a pure
`nextStages(chain: RawEvolutionChain, speciesId: number): number[]`. It finds the node for
`speciesId` anywhere in the tree and returns its children's ids. It returns an empty list for a
final stage or for a species missing from the chain. Ids come from each node's `species.url`.

A next stage whose id is not in the species index is dropped rather than shown by number.

### UI

- `src/components/ui/dropdown-menu.tsx`: shadcn's dropdown menu, added with the shadcn CLI. It is
  built on Base UI, which the app already depends on. No new dependency.
- `src/features/encounters/evolve-control.tsx`: the Evolve button and its menu of next stages.
  It shows the loading and failure states.
- `src/features/encounters/edit-mon-dialog.tsx` holds a pending species. The species field, badge
  and the "Evolved from X · Undo" note read from it. In a randomised-evolutions run, Evolve swaps
  the read-only field for `SpeciesPicker`. Save passes `evolvedTo` when the pending species
  differs from `mon.speciesId`.

## Testing

Hand-written fixtures only, trimmed to the fields `map.ts` reads.

- `nextStages`: a linear chain (Bellsprout), a branch (Oddish to Gloom to Vileplume or
  Bellossom), a wide fan (Eevee, trimmed), a single-stage species, and a species missing from the
  chain.
- `evolveMon`: changes `speciesId` only. `speciesIdCaught`, `caughtRouteId` and `levelCaught` are
  untouched. It throws on an empty species.
- The mutation: species and level changes arrive in one write. No `evolvedTo` means the species is
  unchanged.
- `useNextEvolutions`: resolves through species and chain, and drops ids missing from the index.
- The dialog and control: one stage, a branch, a final stage with no button, randomised showing
  the full picker, Undo, stepping twice, Cancel discarding, loading disabling the button, failure
  showing the notice, and the browser offline via TanStack's `onlineManager`.

Mutation probes, each of which must turn the suite red:

- `nextStages` returns the whole chain instead of the next stage
- `evolveMon` overwrites `speciesIdCaught`
- Save drops `evolvedTo`
- Undo restores the previous step instead of the species the dialog opened with
- the randomised check is inverted

## Delivery

One PR on PER-37. Expected about 650 lines, over the 500 target. Theo approved one PR for this.
The shadcn dropdown-menu file is CLI-generated, and the PR says so.

## Out of scope

- Evolution history or events
- Evolving from the party or box screens, which are not built yet
- Correcting a wrongly logged species (PER-48)
- Filtering evolutions by generation, deliberately
- Evolution conditions such as level, item or trade
