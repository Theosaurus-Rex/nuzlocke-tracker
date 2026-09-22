# Notes on the generator scripts

Longer reasoning that didn't fit as a short code comment in `scripts/**`.

## extract-heartgold.ts

**Extracting a second game.** To pull a second game from the same upstream project, copy this
script, point it at a different `routes/<id>.txt` / `leagues/<id>.txt` pair, and re-derive
`LEVEL_CORRECTIONS` against an independent source such as Bulbapedia or Serebii. Do not assume
the upstream levels are correct.

**LEVEL_CORRECTIONS sourcing.** Brock's HGSS Kanto team (`k6`): nuzlocke.data lists Kabutops at
level 54, but both Bulbapedia and Serebii independently list it at level 52. Brock's ace, Onix
at level 54, is unaffected, so this doesn't change his level cap, but the roster itself was
wrong. `fights.ts` now carries this correction directly on Brock's entry, so this table only
matters if the game is ever re-bootstrapped from scratch.

## extract-pokedex.ts

**PokeAPI's two generation-tagging schemes.** PokeAPI serves present-day values by default, not
the value for a particular generation. Pickers are free-text across all generations, so this
dataset keeps the full history and resolves it at read time (see `src/game/data/pokedex/types.ts`
for the resolution rule).

`past_types` is generation-tagged the same way our `pastTypes` is, so it copies straight across
as `{ throughGeneration: N, types: V }`, sorted ascending.

`past_values` is version-group-tagged and runs the opposite direction, so each entry is converted
with `throughGeneration = generationOf(taggedVersionGroup) - 1`. This collapses to
whole-generation granularity: a change strictly within a generation rounds down to the previous
boundary. This is accepted and doesn't affect any generation this dataset is tested against
(`src/game/pokedex.test.ts`): the one intra-Gen-4 case PokeAPI records, Vine Whip's
diamond-pearl tag, still resolves through the following entry for every Gen 4 target, exactly as
the rounded-down value predicts.
