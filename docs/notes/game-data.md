# Game data notes

Reasoning that is too long for a code comment, kept here and linked from the source.

## Per-generation resolution (`pastTypes` / `pastValues`)

`pastTypes` entries are generation-tagged: an entry means these types applied through this
generation, inclusive. Resolve by taking the first entry, ascending by `throughGeneration`,
that is `>= target`, falling back to the current `types` field if none qualifies. Example:
Clefairy is Normal through Gen 5 and Fairy from Gen 6, since Fairy did not exist before then.

`pastValues` resolves the same way but per field. PokeAPI's own `past_values` is
version-group-tagged and runs the opposite direction to our generation-tagged data, so it is
collapsed to whole-generation granularity at extraction time (`scripts/extract-pokedex.ts`). A
null field on a qualifying entry means "not specified here": resolution keeps walking to later
qualifying entries for that field before falling back to the move's current top-level value.
Example: Vine Whip is 35 power and 15 pp in Gen 4-5, 45/25 from Gen 6 on.

A species or move introduced after the resolved generation has no earlier history, so
resolution falls through to its current values. That is normal for a randomiser or romhack,
not an error.

Damage class was a per-type rule before Gen 4 and became a per-move property from Gen 4 on.
We store the modern per-move value only.

## Verified ace levels (`heartgold.test.ts`)

`VERIFIED_ACE_LEVELS` is the ace (highest-level) Pokemon for each gym leader, Elite Four member
and the Champion, from the first encounter, not the harder post-Elite-Four rematch rosters.

Cross-checked against Bulbapedia's per-leader gym and Elite Four battle sections, and
https://www.serebii.net/heartgoldsoulsilver/gym.shtml.

It is independent of both nuzlocke.data and scripts/extract-heartgold.ts, so a bad extraction,
or a bad upstream value, fails the test even if the generator's arithmetic is right.
