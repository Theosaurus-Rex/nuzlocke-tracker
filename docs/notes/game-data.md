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

## Diamond and Pearl (`src/game/data/dp/`)

Both versions share one routes list, one fights list and one cap table, so Pearl is a spread of
Diamond. Source files are `routes/d.txt`, `routes/p.txt` and `leagues/dp.txt` from
`domtronn/nuzlocke.data`. Rosters were checked against the `pret/pokediamond` decompilation
(`files/poketool/trainer/trdata.json`, trainer names there are placeholders so fights were found
by trainer class), Bulbapedia's walkthrough and Serebii. Bulbapedia's direct pages return 403 but
its MediaWiki API works, for example `w/api.php?action=parse&prop=wikitext&format=json&page=<Title>`.
Serebii has gym, Elite Four and legendary pages only.

Routes are 57, ending at the Pokémon League with no post-game places. Floaroma Meadow stays
untagged, since its honey tree is its only encounter. Ruin Maniac Cave and Tunnel are one route.
Veilstone City is not a route. Snowpoint City (Haunter trade, gift) and Spear Pillar (Dialga or
Palkia, static) are added after upstream left them out. Route 207, Lake Valor and Trophy Garden
move later to match the walkthrough. Fights are 26, with Barry's starter variants flattened.

Upstream fixes: Cynthia's Lucario is 63 (upstream 64), Saturn's Bronzor at Galactic HQ is 38
(35), and Jupiter's Golbat in the Spear Pillar double is 41 (42). The last one is the decomp's
value. Bulbapedia and upstream say 42. The Barry fights at the Canalave drawbridge and the League
entrance were mislabelled Route 218 and Victory Road upstream.

Serebii typos, not copied: Volkner's Octillery is 47 not 48, and Bertha's Sudowoodo is 56 not 57.

Level caps are Nuzlocke University's Diamond/Pearl block and equal the aces. Badges 3 and 4 are
both 30. Badge sprites 25 to 32 were matched by eye.

Not verified: whether Mars, Jupiter, Saturn and Cyrus can all be walked past (Bulbapedia calls them
scripted story fights, so all are kept), the script-side placement of the Eevee, Happiny egg and
Riolu egg gifts (the decomp's scripts are binary, so these rest on Bulbapedia), and whether Routes
219 to 221 are reachable before the credits (taken from search results, so they stay core).

## Platinum (`src/game/data/platinum/`)

One game, no pair, so it is a plain `GameData` like Emerald. Sources are `routes/pt.txt` and
`leagues/plat.txt` from `domtronn/nuzlocke.data`. `routes/plat.txt` is stale and not used. Rosters
were checked against the `pret/pokeplatinum` decompilation, whose trainer JSON, wild tables and
event scripts are readable. The scripts settled where each gift, static and forced fight is, so
those were checked against source and not only the walkthrough. Bulbapedia and Serebii agree with
the decomp on every ace.

Routes are 59, ending at the Pokémon League. Great Marsh and Trophy Garden are normal routes, as
both are open in the story. Sendoff Spring follows the Distortion World. Lake Valor, Trophy
Garden, Snowpoint City and Sendoff Spring are added after upstream left them out. Ruin Maniac Cave
and Tunnel are one route. Spear Pillar is not a route, and Mesprit roams so it has none. Route
207, the Old Chateau, Valley Windworks and Route 213 move to match the walkthrough. Fights are 28,
with Barry's starter variants flattened and his forced Route 201 fight kept as `rival-1`.

Upstream fixes: Gardenia's Cherrim is level 20 (upstream has Cherubi), Candice's Piloswine is 40
(38), and Barry's fights at Hearthome's gate, Pastoria City, the drawbridge and the League
entrance were mislabelled. Barry's Pastoria fight comes before Crasher Wake.

Level caps are Nuzlocke University's Platinum block and equal the aces. Fantina is third. Badge
sprites follow badge identity: Relic 29, Cobble 27 and Fen 28 for gyms 3 to 5. The Distortion
World, Galactic HQ and Spear Pillar fights have no cap.

Not verified: that Fantina must be third (from the map and walkthrough, no script gate was
found), whether Routes 219 to 221 are reachable before the credits, and Barry's Spear Pillar
partner turn, which is left out.

## Black and White (`src/game/data/bw/`)

One dataset for the pair, like Ruby and Sapphire. Sources are `routes/bl.txt`, `routes/wh.txt` and
`leagues/bw.txt` from `domtronn/nuzlocke.data`. There is no pret-style decomp for these games, but
`squiddonaut/pokeblack` (commit 67d91a78) commits the extracted Black ROM files. Its trainer and
party tables were decoded to check every roster, and all of them match Bulbapedia, Serebii and
upstream except the fixes below. The ROM gives rosters only, not scripts, so required fights, gifts
and statics come from the Bulbapedia API walkthrough and Serebii. The Black ROM holds both
Drayden and Iris and both N rosters, which is how the White side was checked.

Routes are 33, shared, ending at N's Castle. Castelia City, every post-game place and the seven
post-game fossils are out. Virizion is part of Pinwheel Forest, so there is no Rumination Field.
Celestial Tower and Mistralton Cave move to match the walkthrough. Fights are 30 per version.
Striaton is one fight with the three leaders' teams flattened, as the rivals are. Bianca (5),
Cheren (7), every N fight and Ghetsis follow Theo's kind rules, and there is no Champion because
Alder is post-game.

Version split: 28 fights are shared. Black has `gym-drayden` and White has `gym-iris`, with the
same team and the Legend Badge. N's Castle is `boss-n-castle` in both, leading with Zekrom in
Black and Reshiram in White. The shared id is what lets one level cap table serve both versions.
The catch at N's Castle is the other way round, Reshiram in Black and Zekrom in White.

Level caps are Nuzlocke University's Black/White block and equal the aces. The four Elite Four
members are separate milestones at 50, since they can be fought in any order. N's Castle (52) and
Ghetsis (54) are the first boss fights to carry a cap. The rematch, Champion and Undella rows are
post-game and left out.

Badge sprites are 33 and 34, then 36 to 41. Sprite 35 is the Toxic Badge from Black 2 and White 2
and is skipped. 42 is the Wave Badge, also from the sequels.

Upstream fixes: Bianca's Driftveil fight has Musharna 26 (upstream Munna), Cheren's Striaton
starters are level 8 (7), Shauntal's Jellicent is `jellicent-male`, and N at Nacrene City is a boss
(upstream rival) and comes before Lenora. Upstream also repeats the Cheren Striaton block, puts
his Twist Mountain fight on Route 7, mislabels two Elite Four rows, has typos ("Tranier's School",
"Iccirus") and lists Reshiram and Zekrom at Dragonspiral Tower.

Not verified: that Cheren's Striaton school fight is forced (no source calls it optional), that N
at Nacrene comes before Lenora (Bulbapedia says so, Serebii says after), that the Nuvema fights
are kept although they cannot be lost, that the gym order is fixed (from the map and walkthrough,
no script gate was found), and which non-route places have no wild table (Bulbapedia location pages
only, the ROM's wild data was not mapped).

## Black 2 and White 2 (`src/game/data/b2w2/`)

Normal mode only. Challenge Mode rosters and levels are ignored, and Easy Mode is a run-time
level offset with no data. One dataset for the pair. Sources are `routes/bl2.txt`, `routes/wh2.txt`
and `leagues/b2w2.txt` from `domtronn/nuzlocke.data`. Rosters were checked against the trainer and
party tables in `nds197/pokeblack2` (commit 7e46b2eb), which commits the extracted ROM files for
both versions, and against Bulbapedia and Serebii. Both versions read one trainer table. The ROM
gives rosters only, so required fights, gifts and statics come from Bulbapedia and Serebii.

Routes are 39, shared, in the file's order with Relic Passage after Driftveil City. Aspertia City
and Virbank City stay because Surf Pokemon can be met there. The Super Rod is post-game, so no fish
count. Floccesy Town and the 23 post-game places are out. Fights are 29 per version, 8 gyms in a
fixed order, Hugh (4), 12 bosses, the Elite Four and Iris as champion. Hugh's starter variants are
flattened as the rivals are in Black and White. Drayden is the seventh gym and Marlon the eighth.

Version split: 28 fights are shared. `boss-kyurem-giant-chasm` is Black Kyurem at 55 in Black 2 and
White Kyurem at 55 in White 2, under one id so one level cap table serves both. It cannot be
caught, and the level rests on Bulbapedia alone because the trainer table has no row for it.

Left out, and why:
- The first Driftveil tournament (Hugh, Cheren, Colress at 25): not in the trainer table and not
  on Serebii, items are banned and a loss does not black out.
- Rood: optional, nothing in the story needs his building. The Zorua gift stays on Driftveil City.
- Charles, Ingo and Emmet: forced, but ordinary trainers.
- Hugh and Cheren as partners, N, Alder and every rematch: not opponents, or post-game.

Level caps are Nuzlocke University's Black/White 2 block and equal the aces. The Elite Four are
separate milestones at 58, then Iris at 59. No boss fight has a cap, since each is met under the
current cap. The rematch rows are post-game.

Badge sprites are 34 to 39, 41 and 42. Sprite 33 (Trio) and 40 (Freeze) are Black and White badges.

Upstream fixes: 23 post-game place rows and Floccesy Town are dropped, Aspertia and Virbank lose
their Super Rod fish, the Kyurem fight is added (upstream has it only as a wild species), Iris is
a champion not an Elite Four member, the Pokemon World Tournament and Ingo and Emmet rows were
mislabelled as rivals and are out, and Zinzolin at Lacunosa and the Command Center no longer
carries his partner Grunt's Pokemon. Marlon's Jellicent is `jellicent-male`.

Not verified: the Kyurem level (Bulbapedia only), Zinzolin in Kyurem's room (ROM and Bulbapedia,
no Serebii table), that Colress at Route 4 cannot be walked past (Bulbapedia's location page
only), that the gym order is fixed (map and walkthrough, no script gate found), and which non-route
places have no wild table (Bulbapedia location pages, the ROM's wild data was not mapped).

## X and Y (`src/game/data/xy/`)

One dataset for the pair. Routes, fights and caps are identical in both versions, so `y` is `x`
with its own id and name. The only real difference is Xerneas in X and Yveltal in Y at the Team
Flare Secret HQ, which is one route either way. The source is `routes/xy.txt` and `leagues/xy.txt`
from `domtronn/nuzlocke.data`. No ROM data exists for Gen 6, so rosters were checked against
Bulbapedia's walkthrough and character pages and against Serebii. Serebii has tables for the gyms,
the Elite Four, Diantha and Lysandre's last fight only. Every other roster rests on Bulbapedia and
upstream, which agree.

Routes are 43, shared. Route 22 sits early after Santalune City, Parfum Palace stays for its
fishing pond, and Terminus Cave follows Route 18. Santalune City (Farfetch'd trade), Snowbelle
City (Bisharp trade), Lumiose City (Kanto starter), Tower of Mastery (Lucario) and the Team Flare
Secret HQ (Xerneas or Yveltal) are added as routes. Lapras is on Route 12, Snorlax on Route 7 and
the fossils at Ambrette Town. The hotel trades get no route. Aquacorde Town, the Battle Chateau,
the second Route 22, Sea Spirit's Den and Friend Safari are out.

Fights are 39 per version: 8 gyms in a fixed order, 15 rival, 11 boss, the Elite Four and Diantha
as champion. The rival fights are the friends (Calem or Serena, Shauna, Tierno, Trevor), Sycamore
and Korrina's two non-gym fights. The starter variants and both genders are listed together.
The boss fights are the 11 named Team Flare fights: Lysandre three times, Xerosic once, Aliana and
Mable twice each, Celosia and Bryony once each in the Lysandre Labs and together at the Poké Ball
Factory. That Factory fight and Trevor and Tierno on Route 7 are multi battles, so each is one
fight with both teams.

Left out, and why:
- Unnamed Admins and Grunts: ordinary trainers.
- Calem or Serena as a partner: not an opponent.
- AZ: after the Hall of Fame.
- Everything optional or post-game, including the Battle Maison and every rematch.

Level caps are Nuzlocke University's X/Y block and equal the aces. The Elite Four are separate
milestones at 65, then Diantha at 68. No boss fight has a cap. Several bosses and rivals exceed the
cap in force by 1 to 6 levels, such as Mable at 48 under a cap of 42. That is how Kalos is, not a
data error. Badge sprites are 43 to 50, in gym order.

Forms: the rival's Meowstic is `meowstic-male` in all five fights, Olympia's is `meowstic-female`.
Pyroar is `pyroar-male` everywhere because PokeAPI has no female form. Diantha's Gourgeist is
`gourgeist-average`. Mega Evolution is not modelled, so Lysandre's Gyarados, Korrina's Lucario and
Diantha's Gardevoir are recorded as the base species.

Upstream fixes: Korrina at the Tower of Mastery is level 32 not 25, the Victory Road starters are
61 not 46, Diantha is a champion with `gourgeist-average` not `gourgeist-large`, Malva's `pyroar`
is `pyroar-male`, the duplicate Route 22 and the post-game rows are dropped, and the label typos
(Tower of Mystery, Victory Roa) are corrected.

Not verified: the rosters that have no Serebii table, Diantha's Gourgeist form (Bulbapedia only),
that Tierno on Route 5, the Route 7 multi battle, Calem or Serena at Coumarine City and the Route
19 trio cannot be walked past (Bulbapedia wording only), that Celosia and Bryony in the Lysandre
Labs cannot be bypassed, that the gym order is fixed (map and walkthrough, no script gate found,
and whether Shalour opens before the Cyllage badge is unconfirmed), and which non-route places have
no wild table (Bulbapedia location pages).

## Omega Ruby and Alpha Sapphire (`src/game/data/oras/`)

One dataset for the pair with two real differences. Fights are shared except eight villain fights,
Team Magma in Omega Ruby and Team Aqua in Alpha Sapphire. Routes are shared with one id, and
`lilycove-hideout` is named Magma Hideout in Omega Ruby and Aqua Hideout in Alpha Sapphire. The
sources are `routes/or.txt`, `routes/as.txt` and `leagues/oras.txt` from `domtronn/nuzlocke.data`.
No ROM data exists for Gen 6, so rosters were checked against Bulbapedia's walkthrough and
character pages and against Serebii. Serebii has tables for the gyms, the Elite Four, Steven, the
rival, Wally and every Magma and Aqua fight. Its Team page lists only the Admin for a multi battle,
so the grunt halves of the Meteor Falls and Southern Island fights rest on Bulbapedia and upstream.

Routes are 69, in the walkthrough order. New Mauville sits after the Cave of Origin because it needs
Mauville Hills, which opens after the eighth gym. Fishing and Surf count as wild, so towns with only
water encounters are untagged routes. Castform (Weather Institute) maps to Route 119, the cosplay
Pikachu to Slateport City, and the Regis and Regigigas to Routes 105, 111 and 120 as in Emerald.
Sea Mauville and the Scorched Slab are kept, since both come before the League. The Latios or
Latias, Groudon or Kyogre and Ho-Oh or Lugia catches differ by version but sit on the same routes.
Five soaring and mirage spots are static routes (Trackless Forest, Nameless Cavern, Pathless Plain,
Fabled Cave, Crescent Isle) and the soaring flocks are one untagged route, all after the Scorched
Slab. Each needs a party condition that the app does not model. Gnarled Den, Giratina and Landorus
need a trade, so they are out.

Fights are 27 per version: 8 gyms in a fixed order, 6 rival, 8 boss, the Elite Four and Steven as
champion. The rival fights are May or Brendan four times (Route 103, Route 110, Route 119 and
Lilycove City) and Wally twice. The starter variants and both genders are listed together. The
Lilycove rival fight was optional in Ruby, Sapphire and Emerald, but both sources describe it as a
scripted catch-up here, so it is kept. The boss fights are Tabitha or Shelly three times, Maxie or
Archie twice and Courtney or Matt three times. Meteor Falls and Southern Island are multi battles,
so each is one fight with both opponents' Pokemon. Left out are Aarune, the Winstrates, unnamed
Admins and Grunts, Maxie and Archie at the Oceanic Museum (no battle), and the Delta Episode,
Battle Resort, S.S. Tidal and every rematch.

Level caps are Nuzlocke University's block and equal the aces. The Elite Four is a fixed order, so
each member has a cap (52, 53, 54, 55), then Steven at 59. No boss or rival exceeds the cap in force
when met. Badge sprites are 17 to 24, in gym order, and were matched by badge name and the Ruby
precedent. Mega Evolution is not modelled, so Steven's Metagross, Wally's Gallade and the Camerupt
and Sharpedo fights are the base species.

Upstream fixes: Matt at the Aqua Hideout has Sharpedo at 39 not 38. Steven is a champion, not an
elite-four. Aarune is dropped. Beldum at Mossdeep is dropped, because Steven leaves it only after
the Hall of Fame. New Mauville moves after the eighth gym. The post-game and conditional place rows
(Sky Pillar, Edge of Space, S.S. Tidal, Battle Resort, the Mirage caves and Gnarled Den) are dropped
or rebuilt as the soaring spots. The Gen 3 Wynaut row at Mirage Island is dropped.

Not verified: the grunt rosters at Meteor Falls and Southern Island (Bulbapedia only), that the
Weather Institute, Mt. Pyre and the Lilycove rival fights cannot be skipped (wording only), that the
Elite Four order is fixed (Bulbapedia wording), the badge images (matched by name, not against a
reference sheet), and the Pacifidlog Corsola trade level (Serebii only).

## Red and Blue (`src/game/data/rb/`)

One dataset for the pair, like FireRed and LeafGreen. Trainers, trades and gifts do not differ
between the versions, only the wild tables and the Game Corner prizes do, and neither is stored.
The sources are `routes/red.txt`, `routes/blue.txt` and `leagues/rb.txt` from
`domtronn/nuzlocke.data`, checked against pret/pokered at commit
`171e2c204f9c1ff8e577ca387a4bbb009e130843` and against Serebii. Every roster species and level
agrees across all three. The FireRed and LeafGreen rosters were not reused, since Gen 1 differs
in the Cerulean rival, every later rival level, all four Elite Four aces and the Champion.

Routes are 45 in traversal order: FireRed's Kanto list plus Route 21, Route 23 and Victory Road.
Cerulean Cave is post-game and left out. Fishing and Surf count as wild, so towns with only water
encounters stay untagged. The gifts sit as follows: Magikarp on Route 4, the fossils and four
trades on Cinnabar Island, Eevee and the Game Corner prizes on Celadon City, the Hitmons on
Saffron City and Lapras on Silph Co. Safari Zone, Pokémon Tower, Seafoam Islands, Mt. Moon and
Pokémon Mansion are one route each.

Fights are 21: 8 gyms, 6 rival, 2 boss, the Elite Four and Blue as champion. The rival fights are
Oak's Lab, Cerulean, the S.S. Anne, Pokémon Tower, Silph Co. and the final Route 22 battle, with
all three starter variants listed together. The first Route 22 battle is optional and ends when
Brock is beaten, so it is left out. The bosses are Giovanni at the Rocket Hideout and at Silph Co.
Left out are the unnamed Rockets, the Karate Master and any rematch, since Gen 1 has none.

Level caps are Nuzlocke University's block and equal the aces. The Elite Four is a fixed order, so
each member has a cap (56, 58, 60, 62), then Blue at 65. Gyms 5 and 6 share a cap of 43, so the
table never drops whatever order the gyms are done in. Badge sprites are 1 to 8, with Koga's Soul
Badge as 5 and Sabrina's Marsh Badge as 6. The release date is the North American one, since the
Japanese Red and Green are a different pair.

Upstream fixes: the Champion is a champion, not an elite-four. The Cerulean rival is marked
optional, but its script fires on the only way north, so it is kept. Cerulean Cave is dropped, and
Silph Co. is added for the Lapras gift. Vermillion and Fuschia are spelled correctly.

Not verified: that the Silph Co. rival fight cannot be bypassed by the elevator (script reading
only).

## Yellow (`src/game/data/yellow/`)

A single game, with its own folder. Routes are copied from Red and Blue rather than imported, so
Yellow can be edited alone. The sources are `routes/yel.txt` and `leagues/yel.txt` from
`domtronn/nuzlocke.data`, checked against pret/pokeyellow at commit
`31b7c2ea2ba6c8c64ed083723fbaa8cbb74669cb`, Serebii and Bulbapedia. The Red and Blue rosters were
not reused. Every gym, both Giovanni story fights, the rival and the Champion differ. Only the
Elite Four match.

Routes are the same 45 as Red and Blue, in the same order. Pikachu is the starter and is never
tagged. Bulbasaur, Charmander and Squirtle are gifts, mapped to Cerulean City, Route 24 and
Vermilion City, which already have wild or fishing encounters, so no route is added and none is
tagged. The Bulbasaur gift needs Pikachu's friendship at 147 and the Squirtle gift needs the
Thunder Badge, and the app models neither. Wild tables, Game Corner prizes and the seven trades
in use are not stored. Pikachu's Beach and the Pokémon Fan Club give no Pokémon.

Fights are 25: 8 gyms, 6 rival, 6 boss, the Elite Four and Blue as champion. The bosses are
Giovanni at the Rocket Hideout and Silph Co., and Jessie and James at Mt. Moon, the Rocket
Hideout, Pokémon Tower and Silph Co. Each Jessie and James fight is one team of three. Only the
Mt. Moon one is not proven forced. The rival's Eevee evolution depends on the Oak's Lab result and
the optional first Route 22 battle, so every rival roster lists Jolteon, Flareon and Vaporeon
together. That first Route 22 battle ends when Brock is beaten, so it is left out.

Level caps are Nuzlocke University's block and equal the aces: 12, 21, 28, 32, 50, 50, 54, 55,
then the Elite Four at 56, 58, 60, 62 and Blue at 65. The table never drops. Badge sprites are 1
to 8, with Koga's Soul Badge as 5 and Sabrina's Marsh Badge as 6. The release date is the North
American one, as for Red and Blue.

Upstream fixes: the final Route 22 rival has its Eevee evolution at 53, where upstream says 40
and Serebii says 50, and pokeyellow and Bulbapedia agree on 53. The Champion is a champion, not an
elite-four. The Cerulean rival sits under Cerulean City, not Route 24. Cerulean Cave is dropped,
and Silph Co. is added for the Lapras gift.

Not verified: that the Silph Co. rival fight cannot be bypassed by the elevator, and that the Mt.
Moon Jessie and James fight cannot be skipped (script reading only).

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

Red and Blue:
- saffron-city: gift (Hitmonlee or Hitmonchan). silph-co: gift (Lapras). Cinnabar Island
  and Celadon City have fishing, so neither is flagged despite the fossils and prizes.

Yellow:
- The same two as Red and Blue. Cerulean City, Route 24 and Vermilion City carry the Kanto
  starter gifts but have wild or fishing encounters, so none is flagged.

Emerald:
- rustboro-city: gift (fossil revival, Seedot trade). lavaridge-town: gift (Wynaut
  egg). fortree-city: gift (Volbeat trade). aqua-hideout: static (Electrode). terra-cave: static
  (Groudon). marine-cave: static (Kyogre).

Ruby and Sapphire:
- rustboro-city: gift (fossil revival, Slakoth trade). lavaridge-town: gift (Wynaut egg).
  fortree-city: gift (Pikachu for Skitty trade). lilycove-hideout: static (Electrode). Sky Pillar
  and the Cave of Origin have wild Pokemon, so neither is flagged.

Diamond and Pearl:
- oreburgh-city: gift (Abra for Machop trade, fossil revival). hearthome-city: gift (Eevee, Happiny
  egg). snowpoint-city: gift (Medicham for Haunter trade). spear-pillar: static (Dialga or
  Palkia). Floaroma Meadow has only a honey tree, which counts as wild, so it is not flagged.

Platinum:
- oreburgh-city: gift (Abra for Machop trade, fossil revival). hearthome-city: gift (Eevee).
  veilstone-city: gift (Porygon). snowpoint-city: gift (Medicham for Haunter trade).
  distortion-world: static (Giratina, Origin Forme). Floaroma Meadow stays untagged. Eterna City,
  Old Chateau and Iron Island have wild Pokemon, so their gifts do not flag them.

Black and White:
- nacrene-city: gift (Tirtouga or Archen fossil revival, Petilil or Cottonee trade). n-castle:
  static (Reshiram in Black, Zekrom in White, a required catch). The Dreamyard monkeys, Route 18
  egg, Cobalion, Virizion and Terrakion sit on routes with wild Pokemon, so none of them flag.

Black 2 and White 2:
- driftveil-city: gift (Zorua from Rood). Every other gift, trade and legendary sits on a route with
  wild Pokemon, so none of them flag.

X and Y:
- santalune-city: gift (Farfetch'd trade). lumiose-city: gift (Kanto starter). tower-of-mastery:
  gift (Lucario). snowbelle-city: gift (Bisharp trade). team-flare-secret-hq: static (Xerneas in X,
  Yveltal in Y, a required catch). Lapras, Snorlax, the fossils and the Steelix trade sit on routes
  with wild Pokemon, so none of them flag.

Omega Ruby and Alpha Sapphire:
- rustboro-city: gift (fossil revival, Makuhita trade). lavaridge-town: gift (Wynaut and Togepi eggs,
  Kecleon). southern-island: gift (Latios in Omega Ruby, Latias in Alpha Sapphire). fortree-city:
  gift (Skitty trade). trackless-forest, nameless-cavern, pathless-plain, fabled-cave, crescent-isle:
  static (the soaring and mirage legendaries). The starter, Slateport City (cosplay Pikachu),
  Route 119 (Castform), the hideout (Electrode), Sea Mauville and the Scorched Slab all have wild
  Pokemon, so none of them flag.
