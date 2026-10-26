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

## Emerald (`src/game/data/emerald/`)

Routes are upstream's `routes/em.txt` as 65 core routes in traversal order, then four post-game
routes after Victory Road: Desert Underpass, Altering Cave, Terra Cave and Marine Cave. Mirage
Island and Sky Pillar stay in the core list. Littleroot Town (the Johto starters need a full
Hoenn dex), Artisan Cave and the event-ticket islands are out. Aqua Hideout is a route for its
static Electrode, which upstream files under the Magma Hideout. Kyogre and Groudon are in Marine
Cave and Terra Cave, not the Cave of Origin. Altering Cave has Zubat only in Emerald, where
upstream lists FireRed's encounters.

Fights are first-run only. The rival's Rustboro and Lilycove fights and Shelly's second Seafloor
Cavern fight are optional and left out, so the rival has three fights. The rival is named
"May / Brendan", with both genders' teams listed together, as well as all three starter
variants. Team Magma, Team Aqua and Steven are kind `boss`. Steven at Meteor Falls is post-game
and is the final cap, 78, from Nuzlocke University's "Meteor Falls: Lv 78" line.

Upstream fixes: Matt has no Sharpedo (a Ruby and Sapphire leftover), Archie has Crobat where
upstream has Golbat, Maxie's Mt. Chimney fight is added, the Champion is kind `champion` where
upstream says `elite-four`, and the rival's Route 119 variants are rebuilt.

### Sources and verified ace levels (`emerald.test.ts`)

Three sources, not two. The `pret/pokeemerald` decompilation (`src/data/trainers.h`,
`trainer_parties.h`, and the map scripts to see which fights can be declined) is the game's own
data. Serebii (https://www.serebii.net/emerald/gym.shtml, elite.shtml, steven.shtml) covers gyms,
Elite Four, Wallace and Steven. Bulbapedia returned 403 to every direct fetch, so its numbers
were read from search result snippets. Gym, Elite Four, Wallace and Steven aces agree across all
of them and upstream, and every cap equals its ace.

Rosters resting on the decomp and upstream only:

- Every rival fight. Serebii has no rival page and Bulbapedia's snippets showed no rival levels.
- Wally's first fight. Both Wally fights are kind `rival`, with no cap.
- Tabitha and Maxie at Mt. Chimney have Bulbapedia as well, Shelly at the Weather Institute
  does not.
- Every gym and Elite Four member below the ace, apart from Claydol and Xatu, which Bulbapedia
  did not show.

Not verified: whether Tabitha at Mt. Chimney and Shelly at the Weather Institute can be walked
past. They are standing trainers, so both are kept. Moves, abilities and held items were not
checked, since the data does not store them. Badge sprites 17 to 24 were matched by eye to the
decomp's badge sheet.

## Ruby and Sapphire (`src/game/data/rs/`)

One directory for both versions. Routes and level caps are shared. The 18 fights the two games
have in common are shared too, and each version adds six villain fights: Team Magma (Tabitha,
Maxie, Courtney) in Ruby and Team Aqua (Matt, Archie, Shelly) in Sapphire. The bosses sit at
their story positions in `order`, and each version's list is the shared fights plus its bosses
sorted by that order. Sources are upstream's `routes/ruby.txt`, `routes/saph.txt` and
`leagues/rs.txt`, checked against Serebii's Ruby and Sapphire pages and `pret/pokeruby`
(`constants/version.inc` decides which trainer each version uses). `routes/ssaph.txt` is a
romhack and is ignored.

Routes are 61 core routes plus Sky Pillar after Victory Road, which is post-game in these
games. The Lilycove hideout is one shared route, `lilycove-hideout`, tagged static for its two
Electrode. Littleroot Town, Altering Cave, Desert Underpass, Mirage Tower, Mirage Island and
Artisan Cave are Emerald areas and are left out. Mirage Island's Wynaut belong to Route 130.

Fights are first-run only, 24 per version. The rival's optional Lilycove fight is left out. The
rival is "May / Brendan" with identical teams, and Wally has two fights, both kind `rival`.

Upstream fixes: Wally's Ralts is level 16 (upstream 17), Drake's Salamence is 55 (53),
Steven's Skarmory is 57 (52), the Champion is kind `champion`, the hideout is added as a route,
and the rival's Route 119 fight comes before the Weather Institute.

Sources for the aces in `rs.test.ts`: the decomp's trainer tables and Serebii's gym and Elite
Four pages agree on every ace. Level caps are Nuzlocke University's Ruby/Sapphire block and equal
the aces, with Wallace at 43 as gym 8.

Rosters resting on the decomp and upstream only: every rival fight, Wally, and every gym and
Elite Four member below the ace. Bulbapedia's Wallace page showed only three of the five levels
and Matt's hideout roster was not shown. Not verified: whether the five admin fights can be
walked past. They are standing trainers that both Serebii and Bulbapedia describe as story
fights, so all five are kept. Badge sprites 17 to 24 are the Emerald numbers, matched by eye to
the decomp's badge sheet.

## Gift-only and static-only routes (`only`)

A route is flagged when nothing on it can be met in the wild. Any grass, surf, fishing, headbutt
or rock smash encounter means no flag. HeartGold and SoulSilver were judged from Serebii's
location pages (https://www.serebii.net/pokearth/johto/ and /kanto/, with `4th/` pages for Gen IV)
and PokeAPI's HGSS location areas. Bulbapedia was read through search snippets only.

The starter route is never tagged in any game. A starter is a mandatory encounter, and a tag would
grey it out under No gifts.

HeartGold and SoulSilver:
- goldenrod-city: gift. Bill's Eevee, Game Corner prizes, Machop trade. Serebii lists no wild
  Pokemon (https://www.serebii.net/pokearth/johto/goldenrodcity.shtml).
- saffron-city: gift. Pikachu-for-Raichu trade only
  (https://www.serebii.net/pokearth/kanto/4th/saffroncity.shtml).
- rocket-hideout: static. Voltorb and Electrode, which PokeAPI lists as static.
- power-plant: static. Zapdos once the Machine Part is back, plus the Magneton trade. Wild
  Pokemon live outside the building per Bulbapedia's Kanto Power Plant page.
- Not flagged because of wild encounters: new-bark-town, violet-city (fishing), cliff-edge-gate
  (surf, https://www.serebii.net/pokearth/johto/cliffedgegate.shtml), bell-tower (Rattata and
  Gastly), pewter-city (headbutt), cinnabar-island, celadon-city and the rest.
- indigo-plateau has nothing obtainable, so neither tag fits.

FireRed and LeafGreen (from the research notes, which checked each route against Serebii and
PokeAPI):
- saffron-city: gift (Hitmonlee or Hitmonchan). silph-co: gift (Lapras).

Emerald:
- rustboro-city: gift (fossil revival, Seedot trade). lavaridge-town: gift (Wynaut
  egg). fortree-city: gift (Volbeat trade). aqua-hideout: static (Electrode). terra-cave: static
  (Groudon). marine-cave: static (Kyogre).

Ruby and Sapphire:
- rustboro-city: gift (fossil revival, Slakoth trade). lavaridge-town: gift (Wynaut egg).
  fortree-city: gift (Pikachu for Skitty trade). lilycove-hideout: static (Electrode). Sky Pillar
  and the Cave of Origin have wild Pokemon, so neither is flagged.
