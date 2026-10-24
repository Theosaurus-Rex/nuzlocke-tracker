# Game data notes

Reasoning that is too long for a code comment, kept here and linked from the source.

## Per-generation resolution (`pastTypes` / `pastValues`)

`pastTypes` entries are generation-tagged: an entry means these types applied through this
generation, inclusive. Resolve by taking the first entry, ascending by `throughGeneration`,
that is `>= target`, falling back to the current `types` field if none qualifies. Example:
Clefairy is Normal through Gen 5 and Fairy from Gen 6, since Fairy did not exist before then.

`pastValues` resolves the same way but per field. PokeAPI's own `past_values` is
version-group-tagged and runs the opposite direction to our generation-tagged data, so it is
collapsed to whole-generation granularity at runtime, in `src/game/pokeapi/map.ts`, using the
version-group-to-generation table in `src/game/pokeapi/generations.ts`. An unknown version
group is skipped. A null field on a qualifying entry means "not specified here": resolution
keeps walking to later qualifying entries for that field before falling back to the move's
current top-level value. Example: Vine Whip is 35 power and 15 pp in Gen 4-5, 45/25 from
Gen 6 on.

A species or move introduced after the resolved generation has no earlier history, so
resolution falls through to its current values. That is normal for a randomiser or romhack,
not an error.

Damage class was a per-type rule before Gen 4 and became a per-move property from Gen 4 on.
We store the modern per-move value only.

## Level caps (`src/game/data/heartgold/level-caps.ts`)

The cap table is copied from Nuzlocke University's "Hardcore Nuzlocke Level Caps by Generation".
Its Johto, Elite Four and Champion numbers equal the verified ace levels below. Its Kanto gyms are
listed in town order, with caps that go up and down. Our table sorts them lowest first, so the
cap follows badges held and never drops. The source has Pryce at 34 after Jasmine at 35. We hold
the cap at 35 for Pryce so it never goes down. His verified ace stays 34.
Red's 88 is the source's number and his top level in our roster.

## Verified ace levels (`heartgold.test.ts`)

`VERIFIED_ACE_LEVELS` is the ace (highest-level) Pokemon for each gym leader, Elite Four member
and the Champion, from the first encounter, not the harder post-Elite-Four rematch rosters.

Cross-checked against Bulbapedia's per-leader gym and Elite Four battle sections, and
https://www.serebii.net/heartgoldsoulsilver/gym.shtml.

It is independent of both nuzlocke.data and scripts/extract-heartgold.ts, so a bad extraction,
or a bad upstream value, fails the test even if the generator's arithmetic is right.

## FireRed and LeafGreen (`src/game/data/frlg/`)

One dataset serves both games. Routes, fights and caps are identical, and the two differ only in
wild encounters, which the app does not store.

Routes are upstream's `routes/fr.txt` plus every Sevii area where a Pokemon can be obtained, 72 in
all. Silph Co. is added for the Lapras gift. Moltres is on Mt. Ember, not Victory Road. Navel Rock
and Birth Island are left out, since Lugia, Ho-Oh and Deoxys are event-only on the original
cartridges. The Dunsparce route is Three Isle Port, since the town has nothing to catch.

Fights are first-run only, with no post-game rematches. Giovanni's Rocket Hideout and Silph Co.
fights are kind `boss`, which grants no badge and has no cap. Upstream's "S.S. Anne" and "Rocket
Hideout" route entries are fights here, because nothing can be caught in either.

Rival rosters list all three starter variants together, as HeartGold's Silver does. Upstream tags
the variants by the player's starter, and Serebii tags them by the rival's.

Level caps are Nuzlocke University's. Every cap equals the verified ace. The middle three gyms
(43, 43, 47) tie or rise in any order, so badge-count order needs no holds.

### Verified ace levels (`frlg.test.ts`)

Gym leaders, Elite Four and Champion aces agree between upstream, Serebii
(https://www.serebii.net/fireredleafgreen/gyms.shtml, elitefour.shtml, rival.shtml) and
Bulbapedia's per-leader pages. Bulbapedia returned 403 to every direct fetch, so its numbers were
read from search result snippets, not full pages.

Rosters resting on Serebii and upstream only:

- Both Giovanni boss fights (Bulbapedia showed only Onix 25 for the Hideout).
- Every rival level below the Champion's lead, apart from the Cerulean fight, which Bulbapedia
  also confirms (Abra 16, where upstream has 15).
- Every gym and Elite Four member below the ace.
