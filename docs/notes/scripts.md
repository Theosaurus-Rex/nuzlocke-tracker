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
