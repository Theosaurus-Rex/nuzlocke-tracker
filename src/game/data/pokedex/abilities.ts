/**
 * Abilities referenced by at least one species (hidden abilities included).
 *
 * Bootstrapped by scripts/extract-pokedex.ts from PokeAPI (https://pokeapi.co/).
 * This file is hand-owned now (CLAUDE.md "Game data") — edit it directly and note why
 * in a comment beside the change.
 *
 * Spans every generation. Types and move stats are stored as present-day (current) values plus
 * a history (`pastTypes` / `pastValues`); resolve against a specific generation with
 * `pokedexFor(generation)` in src/game/pokedex.ts, never by reading these fields directly. See
 * ./types.ts for the resolution rule and scripts/extract-pokedex.ts for how the history is
 * derived.
 */

export interface AbilityDef {
  id: number;
  name: string;
  /** The generation this ability was first introduced in. */
  introducedInGeneration: number;
  shortEffect: string;
}

export const abilities: AbilityDef[] = [
  {
    id: 1,
    name: "stench",
    introducedInGeneration: 3,
    shortEffect: "Has a 10% chance of making target Pokémon flinch with each hit.",
  },
  {
    id: 2,
    name: "drizzle",
    introducedInGeneration: 3,
    shortEffect: "Summons rain that lasts indefinitely upon entering battle.",
  },
  {
    id: 3,
    name: "speed-boost",
    introducedInGeneration: 3,
    shortEffect: "Raises Speed one stage after each turn.",
  },
  {
    id: 4,
    name: "battle-armor",
    introducedInGeneration: 3,
    shortEffect: "Protects against critical hits.",
  },
  {
    id: 5,
    name: "sturdy",
    introducedInGeneration: 3,
    shortEffect:
      "Prevents being KOed from full HP, leaving 1 HP instead. Protects against the one-hit KO moves regardless of HP.",
  },
  {
    id: 6,
    name: "damp",
    introducedInGeneration: 3,
    shortEffect:
      "Prevents Self-Destruct, Explosion, and Aftermath from working while the Pokémon is in battle.",
  },
  { id: 7, name: "limber", introducedInGeneration: 3, shortEffect: "Prevents paralysis." },
  {
    id: 8,
    name: "sand-veil",
    introducedInGeneration: 3,
    shortEffect:
      "Increases evasion to 1.25× during a sandstorm. Protects against sandstorm damage.",
  },
  {
    id: 9,
    name: "static",
    introducedInGeneration: 3,
    shortEffect: "Has a 30% chance of paralyzing attacking Pokémon on contact.",
  },
  {
    id: 10,
    name: "volt-absorb",
    introducedInGeneration: 3,
    shortEffect: "Absorbs Electric moves, healing for 1/4 max HP.",
  },
  {
    id: 11,
    name: "water-absorb",
    introducedInGeneration: 3,
    shortEffect: "Absorbs Water moves, healing for 1/4 max HP.",
  },
  {
    id: 12,
    name: "oblivious",
    introducedInGeneration: 3,
    shortEffect: "Prevents infatuation and protects against Captivate.",
  },
  {
    id: 13,
    name: "cloud-nine",
    introducedInGeneration: 3,
    shortEffect: "Negates all effects of weather, but does not prevent the weather itself.",
  },
  {
    id: 14,
    name: "compound-eyes",
    introducedInGeneration: 3,
    shortEffect: "Increases moves' accuracy to 1.3×.",
  },
  { id: 15, name: "insomnia", introducedInGeneration: 3, shortEffect: "Prevents sleep." },
  {
    id: 16,
    name: "color-change",
    introducedInGeneration: 3,
    shortEffect: "Changes type to match when hit by a damaging move.",
  },
  { id: 17, name: "immunity", introducedInGeneration: 3, shortEffect: "Prevents poison." },
  {
    id: 18,
    name: "flash-fire",
    introducedInGeneration: 3,
    shortEffect:
      "Protects against Fire moves. Once one has been blocked, the Pokémon's own Fire moves inflict 1.5× damage until it leaves battle.",
  },
  {
    id: 19,
    name: "shield-dust",
    introducedInGeneration: 3,
    shortEffect: "Protects against incoming moves' extra effects.",
  },
  { id: 20, name: "own-tempo", introducedInGeneration: 3, shortEffect: "Prevents confusion." },
  {
    id: 21,
    name: "suction-cups",
    introducedInGeneration: 3,
    shortEffect: "Prevents being forced out of battle by other Pokémon's moves.",
  },
  {
    id: 22,
    name: "intimidate",
    introducedInGeneration: 3,
    shortEffect: "Lowers opponents' Attack one stage upon entering battle.",
  },
  {
    id: 23,
    name: "shadow-tag",
    introducedInGeneration: 3,
    shortEffect: "Prevents opponents from fleeing or switching out.",
  },
  {
    id: 24,
    name: "rough-skin",
    introducedInGeneration: 3,
    shortEffect: "Damages attacking Pokémon for 1/8 their max HP on contact.",
  },
  {
    id: 25,
    name: "wonder-guard",
    introducedInGeneration: 3,
    shortEffect: "Protects against damaging moves that are not super effective.",
  },
  { id: 26, name: "levitate", introducedInGeneration: 3, shortEffect: "Evades Ground moves." },
  {
    id: 27,
    name: "effect-spore",
    introducedInGeneration: 3,
    shortEffect:
      "Has a 30% chance of inflcting either paralysis, poison, or sleep on attacking Pokémon on contact.",
  },
  {
    id: 28,
    name: "synchronize",
    introducedInGeneration: 3,
    shortEffect:
      "Copies burns, paralysis, and poison received onto the Pokémon that inflicted them.",
  },
  {
    id: 29,
    name: "clear-body",
    introducedInGeneration: 3,
    shortEffect: "Prevents stats from being lowered by other Pokémon.",
  },
  {
    id: 30,
    name: "natural-cure",
    introducedInGeneration: 3,
    shortEffect: "Cures any major status ailment upon switching out.",
  },
  {
    id: 31,
    name: "lightning-rod",
    introducedInGeneration: 3,
    shortEffect:
      "Redirects single-target Electric moves to this Pokémon where possible. Absorbs Electric moves, raising Special Attack one stage.",
  },
  {
    id: 32,
    name: "serene-grace",
    introducedInGeneration: 3,
    shortEffect: "Doubles the chance of moves' extra effects occurring.",
  },
  {
    id: 33,
    name: "swift-swim",
    introducedInGeneration: 3,
    shortEffect: "Doubles Speed during rain.",
  },
  {
    id: 34,
    name: "chlorophyll",
    introducedInGeneration: 3,
    shortEffect: "Doubles Speed during strong sunlight.",
  },
  {
    id: 35,
    name: "illuminate",
    introducedInGeneration: 3,
    shortEffect: "Doubles the wild encounter rate.",
  },
  {
    id: 36,
    name: "trace",
    introducedInGeneration: 3,
    shortEffect: "Copies an opponent's ability upon entering battle.",
  },
  {
    id: 37,
    name: "huge-power",
    introducedInGeneration: 3,
    shortEffect: "Doubles Attack in battle.",
  },
  {
    id: 38,
    name: "poison-point",
    introducedInGeneration: 3,
    shortEffect: "Has a 30% chance of poisoning attacking Pokémon on contact.",
  },
  { id: 39, name: "inner-focus", introducedInGeneration: 3, shortEffect: "Prevents flinching." },
  { id: 40, name: "magma-armor", introducedInGeneration: 3, shortEffect: "Prevents freezing." },
  { id: 41, name: "water-veil", introducedInGeneration: 3, shortEffect: "Prevents burns." },
  {
    id: 42,
    name: "magnet-pull",
    introducedInGeneration: 3,
    shortEffect: "Prevents Steel opponents from fleeing or switching out.",
  },
  {
    id: 43,
    name: "soundproof",
    introducedInGeneration: 3,
    shortEffect: "Protects against sound-based moves.",
  },
  {
    id: 44,
    name: "rain-dish",
    introducedInGeneration: 3,
    shortEffect: "Heals for 1/16 max HP after each turn during rain.",
  },
  {
    id: 45,
    name: "sand-stream",
    introducedInGeneration: 3,
    shortEffect: "Summons a sandstorm that lasts indefinitely upon entering battle.",
  },
  {
    id: 46,
    name: "pressure",
    introducedInGeneration: 3,
    shortEffect: "Increases the PP cost of moves targetting the Pokémon by one.",
  },
  {
    id: 47,
    name: "thick-fat",
    introducedInGeneration: 3,
    shortEffect: "Halves damage from Fire and Ice moves.",
  },
  {
    id: 48,
    name: "early-bird",
    introducedInGeneration: 3,
    shortEffect: "Makes sleep pass twice as quickly.",
  },
  {
    id: 49,
    name: "flame-body",
    introducedInGeneration: 3,
    shortEffect: "Has a 30% chance of burning attacking Pokémon on contact.",
  },
  {
    id: 50,
    name: "run-away",
    introducedInGeneration: 3,
    shortEffect: "Ensures success fleeing from wild battles.",
  },
  {
    id: 51,
    name: "keen-eye",
    introducedInGeneration: 3,
    shortEffect: "Prevents accuracy from being lowered.",
  },
  {
    id: 52,
    name: "hyper-cutter",
    introducedInGeneration: 3,
    shortEffect: "Prevents Attack from being lowered by other Pokémon.",
  },
  {
    id: 53,
    name: "pickup",
    introducedInGeneration: 3,
    shortEffect:
      "Picks up other Pokémon's used and Flung held items. May also pick up an item after battle.",
  },
  { id: 54, name: "truant", introducedInGeneration: 3, shortEffect: "Skips every second turn." },
  {
    id: 55,
    name: "hustle",
    introducedInGeneration: 3,
    shortEffect:
      "Strengthens physical moves to inflict 1.5× damage, but decreases their accuracy to 0.8×.",
  },
  {
    id: 56,
    name: "cute-charm",
    introducedInGeneration: 3,
    shortEffect: "Has a 30% chance of infatuating attacking Pokémon on contact.",
  },
  {
    id: 57,
    name: "plus",
    introducedInGeneration: 3,
    shortEffect: "Increases Special Attack to 1.5× when a friendly Pokémon has Plus or Minus.",
  },
  {
    id: 58,
    name: "minus",
    introducedInGeneration: 3,
    shortEffect: "Increases Special Attack to 1.5× when a friendly Pokémon has Plus or Minus.",
  },
  {
    id: 59,
    name: "forecast",
    introducedInGeneration: 3,
    shortEffect: "Changes Castform's type and form to match the weather.",
  },
  {
    id: 60,
    name: "sticky-hold",
    introducedInGeneration: 3,
    shortEffect: "Prevents a held item from being removed by other Pokémon.",
  },
  {
    id: 61,
    name: "shed-skin",
    introducedInGeneration: 3,
    shortEffect: "Has a 33% chance of curing any major status ailment after each turn.",
  },
  {
    id: 62,
    name: "guts",
    introducedInGeneration: 3,
    shortEffect: "Increases Attack to 1.5× with a major status ailment.",
  },
  {
    id: 63,
    name: "marvel-scale",
    introducedInGeneration: 3,
    shortEffect: "Increases Defense to 1.5× with a major status ailment.",
  },
  {
    id: 64,
    name: "liquid-ooze",
    introducedInGeneration: 3,
    shortEffect: "Damages opponents using leeching moves for as much as they would heal.",
  },
  {
    id: 65,
    name: "overgrow",
    introducedInGeneration: 3,
    shortEffect: "Strengthens Grass moves to inflict 1.5× damage at 1/3 max HP or less.",
  },
  {
    id: 66,
    name: "blaze",
    introducedInGeneration: 3,
    shortEffect: "Strengthens Fire moves to inflict 1.5× damage at 1/3 max HP or less.",
  },
  {
    id: 67,
    name: "torrent",
    introducedInGeneration: 3,
    shortEffect: "Strengthens Water moves to inflict 1.5× damage at 1/3 max HP or less.",
  },
  {
    id: 68,
    name: "swarm",
    introducedInGeneration: 3,
    shortEffect: "Strengthens Bug moves to inflict 1.5× damage at 1/3 max HP or less.",
  },
  {
    id: 69,
    name: "rock-head",
    introducedInGeneration: 3,
    shortEffect: "Protects against recoil damage.",
  },
  {
    id: 70,
    name: "drought",
    introducedInGeneration: 3,
    shortEffect: "Summons strong sunlight that lasts indefinitely upon entering battle.",
  },
  {
    id: 71,
    name: "arena-trap",
    introducedInGeneration: 3,
    shortEffect:
      "Prevents opponents from fleeing or switching out. Eluded by Flying-types and Pokémon in the air.",
  },
  { id: 72, name: "vital-spirit", introducedInGeneration: 3, shortEffect: "Prevents sleep." },
  {
    id: 73,
    name: "white-smoke",
    introducedInGeneration: 3,
    shortEffect: "Prevents stats from being lowered by other Pokémon.",
  },
  {
    id: 74,
    name: "pure-power",
    introducedInGeneration: 3,
    shortEffect: "Doubles Attack in battle.",
  },
  {
    id: 75,
    name: "shell-armor",
    introducedInGeneration: 3,
    shortEffect: "Protects against critical hits.",
  },
  {
    id: 76,
    name: "air-lock",
    introducedInGeneration: 3,
    shortEffect: "Negates all effects of weather, but does not prevent the weather itself.",
  },
  {
    id: 77,
    name: "tangled-feet",
    introducedInGeneration: 4,
    shortEffect: "Doubles evasion when confused.",
  },
  {
    id: 78,
    name: "motor-drive",
    introducedInGeneration: 4,
    shortEffect: "Absorbs Electric moves, raising Speed one stage.",
  },
  {
    id: 79,
    name: "rivalry",
    introducedInGeneration: 4,
    shortEffect:
      "Increases damage inflicted to 1.25× against Pokémon of the same gender, but decreases damage to 0.75× against the opposite gender.",
  },
  {
    id: 80,
    name: "steadfast",
    introducedInGeneration: 4,
    shortEffect: "Raises Speed one stage upon flinching.",
  },
  {
    id: 81,
    name: "snow-cloak",
    introducedInGeneration: 4,
    shortEffect: "Increases evasion to 1.25× during hail. Protects against hail damage.",
  },
  {
    id: 82,
    name: "gluttony",
    introducedInGeneration: 4,
    shortEffect: "Makes the Pokémon eat any held Berry triggered by low HP below 1/2 its max HP.",
  },
  {
    id: 83,
    name: "anger-point",
    introducedInGeneration: 4,
    shortEffect: "Raises Attack to the maximum of six stages upon receiving a critical hit.",
  },
  {
    id: 84,
    name: "unburden",
    introducedInGeneration: 4,
    shortEffect: "Doubles Speed upon using or losing a held item.",
  },
  {
    id: 85,
    name: "heatproof",
    introducedInGeneration: 4,
    shortEffect: "Halves damage from Fire moves and burns.",
  },
  {
    id: 86,
    name: "simple",
    introducedInGeneration: 4,
    shortEffect:
      "Doubles the Pokémon's stat modifiers. These doubled modifiers are still capped at -6 or 6 stages.",
  },
  {
    id: 87,
    name: "dry-skin",
    introducedInGeneration: 4,
    shortEffect:
      "Causes 1/8 max HP in damage each turn during strong sunlight, but heals for 1/8 max HP during rain. Increases damage from Fire moves to 1.25×, but absorbs Water moves, healing for 1/4 max HP.",
  },
  {
    id: 88,
    name: "download",
    introducedInGeneration: 4,
    shortEffect:
      "Raises the attack stat corresponding to the opponents' weaker defense one stage upon entering battle.",
  },
  {
    id: 89,
    name: "iron-fist",
    introducedInGeneration: 4,
    shortEffect: "Strengthens punch-based moves to 1.2× their power.",
  },
  {
    id: 90,
    name: "poison-heal",
    introducedInGeneration: 4,
    shortEffect: "Heals for 1/8 max HP after each turn when poisoned in place of damage.",
  },
  {
    id: 91,
    name: "adaptability",
    introducedInGeneration: 4,
    shortEffect: "Increases the same-type attack bonus from 1.5× to 2×.",
  },
  {
    id: 92,
    name: "skill-link",
    introducedInGeneration: 4,
    shortEffect: "Extends two-to-five-hit moves and Triple Kick to their full length every time.",
  },
  {
    id: 93,
    name: "hydration",
    introducedInGeneration: 4,
    shortEffect: "Cures any major status ailment after each turn during rain.",
  },
  {
    id: 94,
    name: "solar-power",
    introducedInGeneration: 4,
    shortEffect:
      "Increases Special Attack to 1.5× but costs 1/8 max HP after each turn during strong sunlight.",
  },
  {
    id: 95,
    name: "quick-feet",
    introducedInGeneration: 4,
    shortEffect: "Increases Speed to 1.5× with a major status ailment.",
  },
  {
    id: 96,
    name: "normalize",
    introducedInGeneration: 4,
    shortEffect: "Makes the Pokémon's moves all act Normal-type.",
  },
  {
    id: 97,
    name: "sniper",
    introducedInGeneration: 4,
    shortEffect: "Strengthens critical hits to inflict 3× damage rather than 2×.",
  },
  {
    id: 98,
    name: "magic-guard",
    introducedInGeneration: 4,
    shortEffect: "Protects against damage not directly caused by a move.",
  },
  {
    id: 99,
    name: "no-guard",
    introducedInGeneration: 4,
    shortEffect: "Ensures all moves used by and against the Pokémon hit.",
  },
  {
    id: 100,
    name: "stall",
    introducedInGeneration: 4,
    shortEffect: "Makes the Pokémon move last within its move's priority bracket.",
  },
  {
    id: 101,
    name: "technician",
    introducedInGeneration: 4,
    shortEffect: "Strengthens moves of 60 base power or less to 1.5× their power.",
  },
  {
    id: 102,
    name: "leaf-guard",
    introducedInGeneration: 4,
    shortEffect: "Protects against major status ailments during strong sunlight.",
  },
  {
    id: 103,
    name: "klutz",
    introducedInGeneration: 4,
    shortEffect: "Prevents the Pokémon from using its held item in battle.",
  },
  {
    id: 104,
    name: "mold-breaker",
    introducedInGeneration: 4,
    shortEffect: "Bypasses targets' abilities if they could hinder or prevent a move.",
  },
  {
    id: 105,
    name: "super-luck",
    introducedInGeneration: 4,
    shortEffect: "Raises moves' critical hit rates one stage.",
  },
  {
    id: 106,
    name: "aftermath",
    introducedInGeneration: 4,
    shortEffect: "Damages the attacker for 1/4 its max HP when knocked out by a contact move.",
  },
  {
    id: 107,
    name: "anticipation",
    introducedInGeneration: 4,
    shortEffect:
      "Notifies all trainers upon entering battle if an opponent has a super-effective move, Self-Destruct, Explosion, or a one-hit KO move.",
  },
  {
    id: 108,
    name: "forewarn",
    introducedInGeneration: 4,
    shortEffect: "Reveals the opponents' strongest move upon entering battle.",
  },
  {
    id: 109,
    name: "unaware",
    introducedInGeneration: 4,
    shortEffect: "Ignores other Pokémon's stat modifiers for damage and accuracy calculation.",
  },
  {
    id: 110,
    name: "tinted-lens",
    introducedInGeneration: 4,
    shortEffect: "Doubles damage inflicted with not-very-effective moves.",
  },
  {
    id: 111,
    name: "filter",
    introducedInGeneration: 4,
    shortEffect: "Decreases damage taken from super-effective moves by 1/4.",
  },
  {
    id: 112,
    name: "slow-start",
    introducedInGeneration: 4,
    shortEffect: "Halves Attack and Speed for five turns upon entering battle.",
  },
  {
    id: 113,
    name: "scrappy",
    introducedInGeneration: 4,
    shortEffect: "Lets the Pokémon's Normal and Fighting moves hit Ghost Pokémon.",
  },
  {
    id: 114,
    name: "storm-drain",
    introducedInGeneration: 4,
    shortEffect:
      "Redirects single-target Water moves to this Pokémon where possible. Absorbs Water moves, raising Special Attack one stage.",
  },
  {
    id: 115,
    name: "ice-body",
    introducedInGeneration: 4,
    shortEffect: "Heals for 1/16 max HP after each turn during hail. Protects against hail damage.",
  },
  {
    id: 116,
    name: "solid-rock",
    introducedInGeneration: 4,
    shortEffect: "Decreases damage taken from super-effective moves by 1/4.",
  },
  {
    id: 117,
    name: "snow-warning",
    introducedInGeneration: 4,
    shortEffect: "Summons hail that lasts indefinitely upon entering battle.",
  },
  {
    id: 118,
    name: "honey-gather",
    introducedInGeneration: 4,
    shortEffect: "The Pokémon may pick up Honey after battle.",
  },
  {
    id: 119,
    name: "frisk",
    introducedInGeneration: 4,
    shortEffect: "Reveals an opponent's held item upon entering battle.",
  },
  {
    id: 120,
    name: "reckless",
    introducedInGeneration: 4,
    shortEffect: "Strengthens recoil moves to 1.2× their power.",
  },
  {
    id: 121,
    name: "multitype",
    introducedInGeneration: 4,
    shortEffect: "Changes Arceus's type and form to match its held Plate.",
  },
  {
    id: 122,
    name: "flower-gift",
    introducedInGeneration: 4,
    shortEffect:
      "Increases friendly Pokémon's Attack and Special Defense to 1.5× during strong sunlight.",
  },
  {
    id: 123,
    name: "bad-dreams",
    introducedInGeneration: 4,
    shortEffect: "Damages sleeping opponents for 1/8 their max HP after each turn.",
  },
  {
    id: 124,
    name: "pickpocket",
    introducedInGeneration: 5,
    shortEffect: "Steals attacking Pokémon's held items on contact.",
  },
  {
    id: 125,
    name: "sheer-force",
    introducedInGeneration: 5,
    shortEffect:
      "Strengthens moves with extra effects to 1.3× their power, but prevents their extra effects.",
  },
  { id: 126, name: "contrary", introducedInGeneration: 5, shortEffect: "Inverts stat changes." },
  {
    id: 127,
    name: "unnerve",
    introducedInGeneration: 5,
    shortEffect: "Prevents opposing Pokémon from eating held Berries.",
  },
  {
    id: 128,
    name: "defiant",
    introducedInGeneration: 5,
    shortEffect: "Raises Attack two stages upon having any stat lowered.",
  },
  {
    id: 129,
    name: "defeatist",
    introducedInGeneration: 5,
    shortEffect: "Halves Attack and Special Attack at 50% max HP or less.",
  },
  {
    id: 130,
    name: "cursed-body",
    introducedInGeneration: 5,
    shortEffect: "Has a 30% chance of Disabling any move that hits the Pokémon.",
  },
  {
    id: 131,
    name: "healer",
    introducedInGeneration: 5,
    shortEffect:
      "Has a 30% chance of curing each adjacent ally of any major status ailment after each turn.",
  },
  {
    id: 132,
    name: "friend-guard",
    introducedInGeneration: 5,
    shortEffect: "Decreases all direct damage taken by friendly Pokémon to 0.75×.",
  },
  {
    id: 133,
    name: "weak-armor",
    introducedInGeneration: 5,
    shortEffect:
      "Raises Speed and lowers Defense by one stage each upon being hit by a physical move.",
  },
  {
    id: 134,
    name: "heavy-metal",
    introducedInGeneration: 5,
    shortEffect: "Doubles the Pokémon's weight.",
  },
  {
    id: 135,
    name: "light-metal",
    introducedInGeneration: 5,
    shortEffect: "Halves the Pokémon's weight.",
  },
  {
    id: 136,
    name: "multiscale",
    introducedInGeneration: 5,
    shortEffect: "Halves damage taken from full HP.",
  },
  {
    id: 137,
    name: "toxic-boost",
    introducedInGeneration: 5,
    shortEffect: "Increases Attack to 1.5× when poisoned.",
  },
  {
    id: 138,
    name: "flare-boost",
    introducedInGeneration: 5,
    shortEffect: "Increases Special Attack to 1.5× when burned.",
  },
  {
    id: 139,
    name: "harvest",
    introducedInGeneration: 5,
    shortEffect:
      "Has a 50% chance of restoring a used Berry after each turn if the Pokémon has held no items in the meantime.",
  },
  {
    id: 140,
    name: "telepathy",
    introducedInGeneration: 5,
    shortEffect: "Protects against friendly Pokémon's damaging moves.",
  },
  {
    id: 141,
    name: "moody",
    introducedInGeneration: 5,
    shortEffect: "Raises a random stat two stages and lowers another one stage after each turn.",
  },
  {
    id: 142,
    name: "overcoat",
    introducedInGeneration: 5,
    shortEffect: "Protects against damage from weather.",
  },
  {
    id: 143,
    name: "poison-touch",
    introducedInGeneration: 5,
    shortEffect: "Has a 30% chance of poisoning target Pokémon upon contact.",
  },
  {
    id: 144,
    name: "regenerator",
    introducedInGeneration: 5,
    shortEffect: "Heals for 1/3 max HP upon switching out.",
  },
  {
    id: 145,
    name: "big-pecks",
    introducedInGeneration: 5,
    shortEffect: "Protects against Defense drops.",
  },
  {
    id: 146,
    name: "sand-rush",
    introducedInGeneration: 5,
    shortEffect: "Doubles Speed during a sandstorm. Protects against sandstorm damage.",
  },
  {
    id: 147,
    name: "wonder-skin",
    introducedInGeneration: 5,
    shortEffect: "Lowers incoming non-damaging moves' base accuracy to exactly 50%.",
  },
  {
    id: 148,
    name: "analytic",
    introducedInGeneration: 5,
    shortEffect: "Strengthens moves to 1.3× their power when moving last.",
  },
  {
    id: 149,
    name: "illusion",
    introducedInGeneration: 5,
    shortEffect:
      "Takes the appearance of the last conscious party Pokémon upon being sent out until hit by a damaging move.",
  },
  {
    id: 150,
    name: "imposter",
    introducedInGeneration: 5,
    shortEffect: "Transforms upon entering battle.",
  },
  {
    id: 151,
    name: "infiltrator",
    introducedInGeneration: 5,
    shortEffect: "Bypasses Light Screen, Reflect, and Safeguard.",
  },
  {
    id: 152,
    name: "mummy",
    introducedInGeneration: 5,
    shortEffect: "Changes attacking Pokémon's abilities to Mummy on contact.",
  },
  {
    id: 153,
    name: "moxie",
    introducedInGeneration: 5,
    shortEffect: "Raises Attack one stage upon KOing a Pokémon.",
  },
  {
    id: 154,
    name: "justified",
    introducedInGeneration: 5,
    shortEffect: "Raises Attack one stage upon taking damage from a Dark move.",
  },
  {
    id: 155,
    name: "rattled",
    introducedInGeneration: 5,
    shortEffect: "Raises Speed one stage upon being hit by a Dark, Ghost, or Bug move.",
  },
  {
    id: 156,
    name: "magic-bounce",
    introducedInGeneration: 5,
    shortEffect: "Reflects most non-damaging moves back at their user.",
  },
  {
    id: 157,
    name: "sap-sipper",
    introducedInGeneration: 5,
    shortEffect: "Absorbs Grass moves, raising Attack one stage.",
  },
  {
    id: 158,
    name: "prankster",
    introducedInGeneration: 5,
    shortEffect: "Raises non-damaging moves' priority by one stage.",
  },
  {
    id: 159,
    name: "sand-force",
    introducedInGeneration: 5,
    shortEffect:
      "Strengthens Rock, Ground, and Steel moves to 1.3× their power during a sandstorm. Protects against sandstorm damage.",
  },
  {
    id: 160,
    name: "iron-barbs",
    introducedInGeneration: 5,
    shortEffect: "Damages attacking Pokémon for 1/8 their max HP on contact.",
  },
  {
    id: 161,
    name: "zen-mode",
    introducedInGeneration: 5,
    shortEffect:
      "Changes Darmanitan's form after each turn depending on its HP: Zen Mode below 50% max HP, and Standard Mode otherwise.",
  },
  {
    id: 162,
    name: "victory-star",
    introducedInGeneration: 5,
    shortEffect: "Increases moves' accuracy to 1.1× for friendly Pokémon.",
  },
  {
    id: 163,
    name: "turboblaze",
    introducedInGeneration: 5,
    shortEffect: "Bypasses targets' abilities if they could hinder or prevent moves.",
  },
  {
    id: 164,
    name: "teravolt",
    introducedInGeneration: 5,
    shortEffect: "Bypasses targets' abilities if they could hinder or prevent moves.",
  },
  {
    id: 165,
    name: "aroma-veil",
    introducedInGeneration: 6,
    shortEffect: "Protects allies against moves that affect their mental state.",
  },
  {
    id: 166,
    name: "flower-veil",
    introducedInGeneration: 6,
    shortEffect:
      "Protects friendly Grass Pokémon from having their stats lowered by other Pokémon.",
  },
  {
    id: 167,
    name: "cheek-pouch",
    introducedInGeneration: 6,
    shortEffect: "Restores HP upon eating a Berry, in addition to the Berry's effect.",
  },
  {
    id: 168,
    name: "protean",
    introducedInGeneration: 6,
    shortEffect: "Changes the bearer's type to match each move it uses.",
  },
  {
    id: 169,
    name: "fur-coat",
    introducedInGeneration: 6,
    shortEffect: "Halves damage from physical attacks.",
  },
  {
    id: 170,
    name: "magician",
    introducedInGeneration: 6,
    shortEffect: "Steals the target's held item when the bearer uses a damaging move.",
  },
  {
    id: 171,
    name: "bulletproof",
    introducedInGeneration: 6,
    shortEffect: "Protects against bullet, ball, and bomb-based moves.",
  },
  {
    id: 172,
    name: "competitive",
    introducedInGeneration: 6,
    shortEffect: "Raises Special Attack by two stages upon having any stat lowered.",
  },
  {
    id: 173,
    name: "strong-jaw",
    introducedInGeneration: 6,
    shortEffect: "Strengthens biting moves to 1.5× their power.",
  },
  {
    id: 174,
    name: "refrigerate",
    introducedInGeneration: 6,
    shortEffect:
      "Turns the bearer's Normal moves into Ice moves and strengthens them to 1.3× their power.",
  },
  {
    id: 175,
    name: "sweet-veil",
    introducedInGeneration: 6,
    shortEffect: "Prevents friendly Pokémon from sleeping.",
  },
  {
    id: 176,
    name: "stance-change",
    introducedInGeneration: 6,
    shortEffect:
      "Changes Aegislash to Blade Forme before using a damaging move, or Shield Forme before using King’s Shield.",
  },
  {
    id: 177,
    name: "gale-wings",
    introducedInGeneration: 6,
    shortEffect: "Raises Flying moves' priority by one stage.",
  },
  {
    id: 178,
    name: "mega-launcher",
    introducedInGeneration: 6,
    shortEffect: "Strengthens aura and pulse moves to 1.5× their power.",
  },
  {
    id: 179,
    name: "grass-pelt",
    introducedInGeneration: 6,
    shortEffect: "Boosts Defense while Grassy Terrain is in effect.",
  },
  {
    id: 180,
    name: "symbiosis",
    introducedInGeneration: 6,
    shortEffect: "Passes the bearer's held item to an ally when the ally uses up its item.",
  },
  {
    id: 181,
    name: "tough-claws",
    introducedInGeneration: 6,
    shortEffect: "Strengthens moves that make contact to 1.33× their power.",
  },
  {
    id: 182,
    name: "pixilate",
    introducedInGeneration: 6,
    shortEffect:
      "Turns the bearer's Normal moves into Fairy moves and strengthens them to 1.3× their power.",
  },
  {
    id: 183,
    name: "gooey",
    introducedInGeneration: 6,
    shortEffect: "Lowers attacking Pokémon's Speed by one stage on contact.",
  },
  {
    id: 186,
    name: "dark-aura",
    introducedInGeneration: 6,
    shortEffect:
      "Strengthens Dark moves to 1.33× their power for all friendly and opposing Pokémon.",
  },
  {
    id: 187,
    name: "fairy-aura",
    introducedInGeneration: 6,
    shortEffect:
      "Strengthens Fairy moves to 1.33× their power for all friendly and opposing Pokémon.",
  },
  {
    id: 188,
    name: "aura-break",
    introducedInGeneration: 6,
    shortEffect: "Makes Dark Aura and Fairy Aura weaken moves of their respective types.",
  },
  {
    id: 192,
    name: "stamina",
    introducedInGeneration: 7,
    shortEffect: "Raises this Pokémon's Defense by one stage when it takes damage from a move.",
  },
  {
    id: 193,
    name: "wimp-out",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon automatically switches out when its HP drops below half.",
  },
  {
    id: 194,
    name: "emergency-exit",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon automatically switches out when its HP drops below half.",
  },
  {
    id: 195,
    name: "water-compaction",
    introducedInGeneration: 7,
    shortEffect: "Raises this Pokémon's Defense by two stages when it's hit by a Water move.",
  },
  {
    id: 196,
    name: "merciless",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon's moves critical hit against poisoned targets.",
  },
  {
    id: 197,
    name: "shields-down",
    introducedInGeneration: 7,
    shortEffect:
      "Transforms this Minior between Core Form and Meteor Form. Prevents major status ailments and drowsiness while in Meteor Form.",
  },
  {
    id: 198,
    name: "stakeout",
    introducedInGeneration: 7,
    shortEffect:
      "This Pokémon's moves have double power against Pokémon that switched in this turn.",
  },
  {
    id: 199,
    name: "water-bubble",
    introducedInGeneration: 7,
    shortEffect:
      "Halves damage from Fire moves, doubles damage of Water moves, and prevents burns.",
  },
  {
    id: 200,
    name: "steelworker",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon's Steel moves have 1.5× power.",
  },
  {
    id: 201,
    name: "berserk",
    introducedInGeneration: 7,
    shortEffect:
      "Raises this Pokémon's Special Attack by one stage every time its HP drops below half.",
  },
  {
    id: 202,
    name: "slush-rush",
    introducedInGeneration: 7,
    shortEffect: "During Hail, this Pokémon has double Speed.",
  },
  {
    id: 203,
    name: "long-reach",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon's moves do not make contact.",
  },
  {
    id: 204,
    name: "liquid-voice",
    introducedInGeneration: 7,
    shortEffect: "Sound-based moves become Water-type.",
  },
  {
    id: 205,
    name: "triage",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon's healing moves have their priority increased by 3.",
  },
  {
    id: 208,
    name: "schooling",
    introducedInGeneration: 7,
    shortEffect: "Wishiwashi becomes Schooling Form when its HP is 25% or higher.",
  },
  {
    id: 209,
    name: "disguise",
    introducedInGeneration: 7,
    shortEffect: "Prevents the first instance of battle damage.",
  },
  {
    id: 212,
    name: "corrosion",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon can inflict poison on Poison and Steel Pokémon.",
  },
  {
    id: 213,
    name: "comatose",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon always acts as though it were Asleep.",
  },
  {
    id: 214,
    name: "queenly-majesty",
    introducedInGeneration: 7,
    shortEffect: "Opposing Pokémon cannot use priority attacks.",
  },
  {
    id: 215,
    name: "innards-out",
    introducedInGeneration: 7,
    shortEffect:
      "When this Pokémon faints from an opponent's move, that opponent takes damage equal to the HP this Pokémon had remaining.",
  },
  {
    id: 216,
    name: "dancer",
    introducedInGeneration: 7,
    shortEffect:
      "Whenever another Pokémon uses a dance move, this Pokémon will use the same move immediately afterwards.",
  },
  {
    id: 217,
    name: "battery",
    introducedInGeneration: 7,
    shortEffect: "Ally Pokémon's moves have their power increased to 1.3×.",
  },
  {
    id: 218,
    name: "fluffy",
    introducedInGeneration: 7,
    shortEffect: "Damage from contact moves is halved. Damage from Fire moves is doubled.",
  },
  {
    id: 219,
    name: "dazzling",
    introducedInGeneration: 7,
    shortEffect: "Opposing Pokémon cannot use priority attacks.",
  },
  {
    id: 220,
    name: "soul-heart",
    introducedInGeneration: 7,
    shortEffect: "This Pokémon's Special Attack rises by one stage every time any Pokémon faints.",
  },
  {
    id: 222,
    name: "receiver",
    introducedInGeneration: 7,
    shortEffect: "When an ally faints, this Pokémon gains its Ability.",
  },
  {
    id: 224,
    name: "beast-boost",
    introducedInGeneration: 7,
    shortEffect: "Raises this Pokémon's highest stat by one stage when it faints another Pokémon.",
  },
  {
    id: 225,
    name: "rks-system",
    introducedInGeneration: 7,
    shortEffect: "Changes this Pokémon's type to match its held Memory.",
  },
  {
    id: 226,
    name: "electric-surge",
    introducedInGeneration: 7,
    shortEffect: "When this Pokémon enters battle, it changes the terrain to Electric Terrain.",
  },
  {
    id: 227,
    name: "psychic-surge",
    introducedInGeneration: 7,
    shortEffect: "When this Pokémon enters battle, it changes the terrain to Psychic Terrain.",
  },
  {
    id: 228,
    name: "misty-surge",
    introducedInGeneration: 7,
    shortEffect: "When this Pokémon enters battle, it changes the terrain to Misty Terrain.",
  },
  {
    id: 229,
    name: "grassy-surge",
    introducedInGeneration: 7,
    shortEffect: "When this Pokémon enters battle, it changes the terrain to Grassy Terrain.",
  },
  {
    id: 230,
    name: "full-metal-body",
    introducedInGeneration: 7,
    shortEffect: "Other Pokémon cannot lower this Pokémon's stats.",
  },
  {
    id: 231,
    name: "shadow-shield",
    introducedInGeneration: 7,
    shortEffect: "When this Pokémon has full HP, regular damage from moves is halved.",
  },
  {
    id: 232,
    name: "prism-armor",
    introducedInGeneration: 7,
    shortEffect: "Reduces super-effective damage to 0.75×.",
  },
  {
    id: 234,
    name: "intrepid-sword",
    introducedInGeneration: 8,
    shortEffect: "Boosts Attack in battle.",
  },
  {
    id: 235,
    name: "dauntless-shield",
    introducedInGeneration: 8,
    shortEffect: "Boosts Defense in battle.",
  },
  {
    id: 236,
    name: "libero",
    introducedInGeneration: 8,
    shortEffect: "Libero changes the Pokémon's type to that of its previously used attack.",
  },
  {
    id: 237,
    name: "ball-fetch",
    introducedInGeneration: 8,
    shortEffect:
      "If the Pokémon is not holding an item, it will fetch the Poké Ball from the first failed throw of the battle.",
  },
  {
    id: 238,
    name: "cotton-down",
    introducedInGeneration: 8,
    shortEffect: "When Ignores moves and abilities that draw in moves.",
  },
  {
    id: 239,
    name: "propeller-tail",
    introducedInGeneration: 8,
    shortEffect: "Ignores moves and abilities that draw in moves.",
  },
  {
    id: 240,
    name: "mirror-armor",
    introducedInGeneration: 8,
    shortEffect: "Reflects any stat-lowering effects.",
  },
  {
    id: 241,
    name: "gulp-missile",
    introducedInGeneration: 8,
    shortEffect:
      "If a Cramorant with Gulp Missile uses Surf or Dive, it catches prey and changes its form depending on its remaining HP.",
  },
  {
    id: 242,
    name: "stalwart",
    introducedInGeneration: 8,
    shortEffect: "Ignores moves and abilities that draw in moves.",
  },
  {
    id: 243,
    name: "steam-engine",
    introducedInGeneration: 8,
    shortEffect:
      "Boosts the Speed stat drastically when the Pokémon is hit by a Fire- or Water-type move.",
  },
  {
    id: 244,
    name: "punk-rock",
    introducedInGeneration: 8,
    shortEffect: "Boosts sound-based moves and halves damage from the same moves.",
  },
  {
    id: 245,
    name: "sand-spit",
    introducedInGeneration: 8,
    shortEffect: "Creates a sandstorm when hit by an attack.",
  },
  {
    id: 246,
    name: "ice-scales",
    introducedInGeneration: 8,
    shortEffect: "Halves damage from Special moves.",
  },
  {
    id: 247,
    name: "ripen",
    introducedInGeneration: 8,
    shortEffect: "Doubles the effect of berries.",
  },
  {
    id: 248,
    name: "ice-face",
    introducedInGeneration: 8,
    shortEffect:
      "The Pokémon’s ice head can take a physical attack as a substitute, but the attack also changes the Pokémon’s appearance. The ice will be restored when it snows.",
  },
  {
    id: 249,
    name: "power-spot",
    introducedInGeneration: 8,
    shortEffect: "Just being next to the Pokémon powers up moves.",
  },
  {
    id: 251,
    name: "screen-cleaner",
    introducedInGeneration: 8,
    shortEffect: "Nullifies effects of Light Screen, Reflect, and Aurora Veil.",
  },
  {
    id: 252,
    name: "steely-spirit",
    introducedInGeneration: 8,
    shortEffect: "Powers up ally Pokémon's Steel-type moves.",
  },
  {
    id: 253,
    name: "perish-body",
    introducedInGeneration: 8,
    shortEffect:
      "When hit by a move that makes direct contact, the Pokémon and the attacker will faint after three turns unless they switch out of battle.",
  },
  {
    id: 254,
    name: "wandering-spirit",
    introducedInGeneration: 8,
    shortEffect: "Swaps abilities with opponents on contact.",
  },
  {
    id: 256,
    name: "neutralizing-gas",
    introducedInGeneration: 8,
    shortEffect: "Neutralizes abilities of all Pokémon in battle.",
  },
  {
    id: 258,
    name: "hunger-switch",
    introducedInGeneration: 8,
    shortEffect:
      "Causes Morpeko to change its form each turn, alternating between Full Belly Mode and Hangry Mode",
  },
  {
    id: 260,
    name: "unseen-fist",
    introducedInGeneration: 8,
    shortEffect: "Contact moves can strike through Protect/Detect.",
  },
  {
    id: 262,
    name: "transistor",
    introducedInGeneration: 8,
    shortEffect: "Powers up Electric-type moves.",
  },
  {
    id: 263,
    name: "dragons-maw",
    introducedInGeneration: 8,
    shortEffect: "Powers up Dragon-type moves.",
  },
  {
    id: 264,
    name: "chilling-neigh",
    introducedInGeneration: 8,
    shortEffect: "Boosts Attack after knocking out a Pokémon.",
  },
  {
    id: 265,
    name: "grim-neigh",
    introducedInGeneration: 8,
    shortEffect: "Boosts Special Attack after knocking out a Pokémon.",
  },
  {
    id: 268,
    name: "lingering-aroma",
    introducedInGeneration: 9,
    shortEffect: "Contact changes the attacker's Ability to Lingering Aroma.",
  },
  {
    id: 269,
    name: "seed-sower",
    introducedInGeneration: 9,
    shortEffect: "Turns the ground into Grassy Terrain when the Pokémon is hit by an attack.",
  },
  {
    id: 270,
    name: "thermal-exchange",
    introducedInGeneration: 9,
    shortEffect: "Raises Attack when hit by a Fire-type move. Cannot be burned.",
  },
  {
    id: 271,
    name: "anger-shell",
    introducedInGeneration: 9,
    shortEffect:
      "When the Pokémon's HP drops below half, Anger Shell lowers its Defense and Special Defense but its Attack, Special Attack and Speed are raised.",
  },
  {
    id: 272,
    name: "purifying-salt",
    introducedInGeneration: 9,
    shortEffect: "Protects from status conditions and halves damage from Ghost-type moves.",
  },
  {
    id: 273,
    name: "well-baked-body",
    introducedInGeneration: 9,
    shortEffect: "Immune to Fire-type moves, and Defense is sharply boosted.",
  },
  {
    id: 274,
    name: "wind-rider",
    introducedInGeneration: 9,
    shortEffect:
      "Gives immunity to wind moves, and causes the Pokémon's Attack to increase by one stage when hit by one.",
  },
  {
    id: 275,
    name: "guard-dog",
    introducedInGeneration: 9,
    shortEffect: "Boosts Attack if intimidated, and prevents being forced to switch out.",
  },
  {
    id: 276,
    name: "rocky-payload",
    introducedInGeneration: 9,
    shortEffect: "Powers up Rock-type moves.",
  },
  {
    id: 277,
    name: "wind-power",
    introducedInGeneration: 9,
    shortEffect:
      "When hit by a wind move, the power of the next Electric-type move it uses is doubled.",
  },
  {
    id: 278,
    name: "zero-to-hero",
    introducedInGeneration: 9,
    shortEffect: "Transforms into its Hero Form when switching out.",
  },
  {
    id: 279,
    name: "commander",
    introducedInGeneration: 9,
    shortEffect: "Goes inside the mouth of an ally Dondozo if one is on the field.",
  },
  {
    id: 280,
    name: "electromorphosis",
    introducedInGeneration: 9,
    shortEffect:
      "When hit by an attack, the power of the next Electric-type move it uses is doubled.",
  },
  {
    id: 281,
    name: "protosynthesis",
    introducedInGeneration: 9,
    shortEffect: "Raises highest stat in harsh sunlight, or if holding Booster Energy.",
  },
  {
    id: 282,
    name: "quark-drive",
    introducedInGeneration: 9,
    shortEffect: "Raises highest stat on Electric Terrain, or if holding Booster Energy.",
  },
  {
    id: 283,
    name: "good-as-gold",
    introducedInGeneration: 9,
    shortEffect: "Gives immunity to status moves.",
  },
  {
    id: 284,
    name: "vessel-of-ruin",
    introducedInGeneration: 9,
    shortEffect: "Lowers Special Attack of all Pokémon except itself.",
  },
  {
    id: 285,
    name: "sword-of-ruin",
    introducedInGeneration: 9,
    shortEffect: "Lowers Defense of all Pokémon except itself.",
  },
  {
    id: 286,
    name: "tablets-of-ruin",
    introducedInGeneration: 9,
    shortEffect: "Lowers Attack of all Pokémon except itself.",
  },
  {
    id: 287,
    name: "beads-of-ruin",
    introducedInGeneration: 9,
    shortEffect: "Lowers Special Defense of all Pokémon except itself.",
  },
  {
    id: 288,
    name: "orichalcum-pulse",
    introducedInGeneration: 9,
    shortEffect: "Turns the sunlight harsh when entering battle, and boosts Attack while active.",
  },
  {
    id: 289,
    name: "hadron-engine",
    introducedInGeneration: 9,
    shortEffect:
      "Creates an Electric Terrain when entering battle, and boosts Special Attack while active.",
  },
  {
    id: 290,
    name: "opportunist",
    introducedInGeneration: 9,
    shortEffect: "Copies stat boosts by the opponent.",
  },
  {
    id: 291,
    name: "cud-chew",
    introducedInGeneration: 9,
    shortEffect:
      "Causes the Pokémon to reuse an already consumed Berry at the end of the next turn.",
  },
  {
    id: 292,
    name: "sharpness",
    introducedInGeneration: 9,
    shortEffect: "Powers up slicing moves.",
  },
  {
    id: 293,
    name: "supreme-overlord",
    introducedInGeneration: 9,
    shortEffect:
      "Attack and Special Attack are boosted for each party Pokémon that has been defeated.",
  },
  {
    id: 294,
    name: "costar",
    introducedInGeneration: 9,
    shortEffect: "Copies ally's stat changes on entering battle.",
  },
  {
    id: 295,
    name: "toxic-debris",
    introducedInGeneration: 9,
    shortEffect:
      "Scatters poison spikes at the feet of the opposing team when the Pokémon takes damage from physical moves.",
  },
  {
    id: 296,
    name: "armor-tail",
    introducedInGeneration: 9,
    shortEffect:
      "Prevents the opponent from using any moves that have priority, such as Quick Attack.",
  },
  {
    id: 297,
    name: "earth-eater",
    introducedInGeneration: 9,
    shortEffect: "Restores HP when hit by a Ground-type move.",
  },
  {
    id: 298,
    name: "mycelium-might",
    introducedInGeneration: 9,
    shortEffect: "Status moves go last, but are not affected by the opponent's ability.",
  },
  {
    id: 300,
    name: "supersweet-syrup",
    introducedInGeneration: 9,
    shortEffect:
      "Once per battle, when a Pokémon with Supersweet Syrup enters the battle, it lowers the evasion stat of all adjacent opponents by one stage.",
  },
  {
    id: 301,
    name: "hospitality",
    introducedInGeneration: 9,
    shortEffect:
      "When a Pokémon with Hospitality enters a battle, it restores HP for an ally by 25%.",
  },
  {
    id: 302,
    name: "toxic-chain",
    introducedInGeneration: 9,
    shortEffect: "May cause bad poisoning when the Pokémon hits an opponent with a move.",
  },
  {
    id: 304,
    name: "tera-shift",
    introducedInGeneration: 9,
    shortEffect:
      "When Terapagos enters the battle, it turns into its Terastal Form until the end of the battle.",
  },
  {
    id: 307,
    name: "poison-puppeteer",
    introducedInGeneration: 9,
    shortEffect: "Pokémon poisoned by Pecharunt's moves will also become confused.",
  },
];
