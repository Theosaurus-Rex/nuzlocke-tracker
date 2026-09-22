/**
 * Curated held items, evolution items and berries. Bootstrapped by scripts/extract-pokedex.ts
 * from PokeAPI (https://pokeapi.co/). Hand-owned now, per CLAUDE.md "Game data". See
 * CURATED_ITEM_SLUGS in the generator for what's included and why.
 */

export interface ItemDef {
  id: number;
  name: string;
  category: string;
  shortEffect: string;
}

export const items: ItemDef[] = [
  {
    id: 80,
    name: "sun-stone",
    category: "evolution",
    shortEffect:
      "Evolves a Cottonee into Whimsicott, a Gloom into Bellossom, a Petilil into Lilligant, or a Sunkern into Sunflora.",
  },
  {
    id: 81,
    name: "moon-stone",
    category: "evolution",
    shortEffect:
      "Evolves a Clefairy into Clefable, a Jigglypuff into Wigglytuff, a Munna into Musharna, a Nidorina into Nidoqueen, a Nidorino into Nidoking, or a Skitty into Delcatty.",
  },
  {
    id: 82,
    name: "fire-stone",
    category: "evolution",
    shortEffect:
      "Evolves an Eevee into Flareon, a Growlithe into Arcanine, a Pansear into Simisear, or a Vulpix into Ninetales.",
  },
  {
    id: 83,
    name: "thunder-stone",
    category: "evolution",
    shortEffect:
      "Evolves an Eelektrik into Eelektross, an Eevee into Jolteon, or a Pikachu into Raichu.",
  },
  {
    id: 84,
    name: "water-stone",
    category: "evolution",
    shortEffect:
      "Evolves an Eevee into Vaporeon, a Lombre into Ludicolo, a Panpour into Simipour, a Poliwhirl into Poliwrath, a Shellder into Cloyster, or a Staryu into Starmie.",
  },
  {
    id: 85,
    name: "leaf-stone",
    category: "evolution",
    shortEffect:
      "Evolves an Exeggcute into Exeggutor, a Gloom into Vileplume, a Nuzleaf into Shiftry, a Pansage into Simisage, or a Weepinbell into Victreebel.",
  },
  {
    id: 107,
    name: "shiny-stone",
    category: "evolution",
    shortEffect:
      "Evolves a Minccino into Cinccino, a Roselia into Roserade, or a Togetic into Togekiss.",
  },
  {
    id: 108,
    name: "dusk-stone",
    category: "evolution",
    shortEffect:
      "Evolves a Lampent into Chandelure, a Misdreavus into Mismagius, or a Murkrow into Honchkrow.",
  },
  {
    id: 109,
    name: "dawn-stone",
    category: "evolution",
    shortEffect: "Evolves a male Kirlia into Gallade or a female Snorunt into Froslass.",
  },
  {
    id: 110,
    name: "oval-stone",
    category: "evolution",
    shortEffect: "Level-up during Day on a Happiny: Holder evolves into Chansey.",
  },
  {
    id: 127,
    name: "chesto-berry",
    category: "medicine",
    shortEffect: "Held: Consumed when asleep to cure sleep.",
  },
  {
    id: 128,
    name: "pecha-berry",
    category: "medicine",
    shortEffect: "Held: Consumed when poisoned to cure poison.",
  },
  {
    id: 131,
    name: "leppa-berry",
    category: "medicine",
    shortEffect: "Held: Consumed when a move runs out of PP to restore its PP by 10.",
  },
  {
    id: 132,
    name: "oran-berry",
    category: "medicine",
    shortEffect: "Held: Consumed at 1/2 max HP to recover 10 HP.",
  },
  {
    id: 133,
    name: "persim-berry",
    category: "medicine",
    shortEffect: "Held: Consumed when confused to cure confusion.",
  },
  {
    id: 134,
    name: "lum-berry",
    category: "medicine",
    shortEffect: "Held: Consumed to cure any status condition or confusion.",
  },
  {
    id: 135,
    name: "sitrus-berry",
    category: "medicine",
    shortEffect: "Held: Consumed at 1/2 max HP to recover 1/4 max HP.",
  },
  {
    id: 136,
    name: "figy-berry",
    category: "picky-healing",
    shortEffect:
      "Held: Consumed at 1/2 max HP to restore 1/8 max HP. Confuses Pokémon that dislike spicy flavor.",
  },
  {
    id: 178,
    name: "liechi-berry",
    category: "in-a-pinch",
    shortEffect: "Held: Consumed at 1/4 max HP to boost Attack.",
  },
  {
    id: 180,
    name: "salac-berry",
    category: "in-a-pinch",
    shortEffect: "Held: Consumed at 1/4 max HP to boost Speed.",
  },
  {
    id: 181,
    name: "petaya-berry",
    category: "in-a-pinch",
    shortEffect: "Held: Consumed at 1/4 max HP to boost Special Attack.",
  },
  {
    id: 184,
    name: "starf-berry",
    category: "in-a-pinch",
    shortEffect: "Held: Consumed at 1/4 max HP to boost a random stat by two stages.",
  },
  {
    id: 187,
    name: "custap-berry",
    category: "in-a-pinch",
    shortEffect: "Held: Consumed at 1/4 max HP when using a move to go first.",
  },
  {
    id: 190,
    name: "bright-powder",
    category: "held-items",
    shortEffect: "Held: Increases the holder’s evasion by 1/9 (11 1/9%).",
  },
  {
    id: 191,
    name: "white-herb",
    category: "held-items",
    shortEffect: "Held: Resets all lowered stats to normal at end of turn. Consumed after use.",
  },
  {
    id: 194,
    name: "quick-claw",
    category: "held-items",
    shortEffect: "Held: Holder has a 3/16 (18.75%) chance to move first.",
  },
  {
    id: 196,
    name: "mental-herb",
    category: "held-items",
    shortEffect:
      "Held: Consumed to cure infatuation. Gen V: Also removes Taunt, Encore, Torment, Disable, and Cursed Body.",
  },
  {
    id: 197,
    name: "choice-band",
    category: "choice",
    shortEffect: "Held: Increases Attack by 50%, but restricts the holder to only one move.",
  },
  {
    id: 198,
    name: "kings-rock",
    category: "held-items",
    shortEffect:
      "Held: Damaging moves gain a 10% chance to make their target flinch. Traded on a Poliwhirl: Holder evolves into Politoed. Traded on a Slowpoke: Holder evolves into Slowking.",
  },
  {
    id: 202,
    name: "soul-dew",
    category: "species-specific",
    shortEffect: "Raises Latias and Latios’s Special Attack and Special Defense by 50%.",
  },
  {
    id: 203,
    name: "deep-sea-tooth",
    category: "species-specific",
    shortEffect:
      "Doubles Clamperl’s Special Attack. Traded on a Clamperl: Holder evolves into Huntail.",
  },
  {
    id: 204,
    name: "deep-sea-scale",
    category: "species-specific",
    shortEffect:
      "Doubles Clamperl’s Special Defense. Traded on a Clamperl: Holder evolves into Gorebyss.",
  },
  {
    id: 206,
    name: "everstone",
    category: "training",
    shortEffect: "Held: Prevents level-based evolution from occuring.",
  },
  {
    id: 208,
    name: "lucky-egg",
    category: "training",
    shortEffect: "Held: Increases EXP earned in battle by 50%.",
  },
  {
    id: 210,
    name: "metal-coat",
    category: "type-enhancement",
    shortEffect: "Held: Steel-Type moves from holder do 20% more damage.",
  },
  {
    id: 211,
    name: "leftovers",
    category: "held-items",
    shortEffect: "Held: Restores 1/16 (6.25%) holder’s max HP at the end of each turn.",
  },
  {
    id: 212,
    name: "dragon-scale",
    category: "evolution",
    shortEffect: "Traded on a Seadra: Holder evolves into Kingdra.",
  },
  {
    id: 213,
    name: "light-ball",
    category: "species-specific",
    shortEffect:
      "Doubles Pikachu’s Attack and Special Attack. Breed on Pikachu or Raichu: Pichu Egg will have Volt Tackle.",
  },
  {
    id: 229,
    name: "up-grade",
    category: "evolution",
    shortEffect: "Traded on a Porygon: Holder evolves into Porygon2.",
  },
  {
    id: 230,
    name: "shell-bell",
    category: "held-items",
    shortEffect: "Held: Holder receives 1/8 of the damage it deals when attacking.",
  },
  {
    id: 234,
    name: "metal-powder",
    category: "species-specific",
    shortEffect:
      "Raises Ditto’s Defense and Special Defense by 50%. The boost is lost after transforming.",
  },
  {
    id: 235,
    name: "thick-club",
    category: "species-specific",
    shortEffect: "Doubles Cubone or Marowak’s Attack.",
  },
  {
    id: 236,
    name: "stick",
    category: "species-specific",
    shortEffect: "Raises Farfetch’d’s critical hit ratio by two stages.",
  },
  {
    id: 242,
    name: "wide-lens",
    category: "held-items",
    shortEffect: "Held: Provides a 1/10 (10%) boost in accuracy to the holder.",
  },
  {
    id: 243,
    name: "muscle-band",
    category: "held-items",
    shortEffect: "Held: Boosts the damage of physical moves used by the holder by 10%.",
  },
  {
    id: 244,
    name: "wise-glasses",
    category: "held-items",
    shortEffect: "Held: Boosts the damage of special moves used by the holder by 1/10 (10%).",
  },
  {
    id: 245,
    name: "expert-belt",
    category: "held-items",
    shortEffect: "Held: Holder’s Super Effective moves do 20% extra damage.",
  },
  {
    id: 247,
    name: "life-orb",
    category: "held-items",
    shortEffect: "Held: Holder’s moves inflict 30% extra damage, but cost 10% max HP.",
  },
  {
    id: 249,
    name: "toxic-orb",
    category: "bad-held-items",
    shortEffect:
      "Held: Inflicts Toxic on the holder at the end of the turn. Activates after Poison damage would occur.",
  },
  {
    id: 250,
    name: "flame-orb",
    category: "bad-held-items",
    shortEffect:
      "Held: Inflicts Burn on the holder at the end of the turn. Activates after Burn damage would occur.",
  },
  {
    id: 252,
    name: "focus-sash",
    category: "held-items",
    shortEffect:
      "Held: Holder survives any single-hit attack at 1 HP if at max HP, then the item is consumed.",
  },
  {
    id: 253,
    name: "zoom-lens",
    category: "held-items",
    shortEffect:
      "Held: Provides a 1/5 (20%) boost in accuracy if the holder moves after the target.",
  },
  {
    id: 254,
    name: "metronome",
    category: "held-items",
    shortEffect:
      "Held: Consectutive uses of the same attack have a cumulative damage boost of 10%. Maximum 100% boost.",
  },
  {
    id: 255,
    name: "iron-ball",
    category: "bad-held-items",
    shortEffect:
      "Held: Holder’s Speed is halved. Negates all Ground-type immunities, and makes Flying-types take neutral damage from Ground-type moves. Arena Trap. Spikes, and Toxic Spikes affect the holder.",
  },
  {
    id: 258,
    name: "black-sludge",
    category: "held-items",
    shortEffect:
      "Held: Poison-type holder recovers 1/16 (6.25%) max HP each turn. Non-Poison-Types take 1/8 (12.5%) max HP damage.",
  },
  {
    id: 264,
    name: "choice-scarf",
    category: "choice",
    shortEffect: "Held: Increases Speed by 50%, but restricts the holder to only one move.",
  },
  {
    id: 265,
    name: "sticky-barb",
    category: "bad-held-items",
    shortEffect:
      "Held: Holder takes 1/8 (12.5%) its max HP at the end of each turn. When the holder is hit by a contact move, the attacking Pokémon takes 1/8 its max HP in damage and receive the item if not holding one.",
  },
  {
    id: 273,
    name: "big-root",
    category: "held-items",
    shortEffect:
      "Held: Increases HP recovered from draining moves, Ingrain, and Aqua Ring by 3/10 (30%).",
  },
  {
    id: 274,
    name: "choice-specs",
    category: "choice",
    shortEffect:
      "Held: Increases Special Attack by 50%, but restricts the holder to only one move.",
  },
  {
    id: 298,
    name: "protector",
    category: "evolution",
    shortEffect: "Traded on a Rhydon: Holder evolves into Rhyperior.",
  },
  {
    id: 299,
    name: "electirizer",
    category: "evolution",
    shortEffect: "Traded on an Electabuzz: Holder evolves into Electivire.",
  },
  {
    id: 300,
    name: "magmarizer",
    category: "evolution",
    shortEffect: "Traded on a Magmar: Holder evolves into Magmortar.",
  },
  {
    id: 301,
    name: "dubious-disc",
    category: "evolution",
    shortEffect: "Traded on a Porygon2: Holder evolves into Porygon-Z.",
  },
  {
    id: 302,
    name: "reaper-cloth",
    category: "evolution",
    shortEffect: "Traded on a Dusclops: Holder evolves into Dusknoir.",
  },
  {
    id: 303,
    name: "razor-claw",
    category: "held-items",
    shortEffect:
      "Held: Raises the holder’s critical hit ratio by one stage. Held by a Sneasel while levelling up at night: Holder evolves into Weavile.",
  },
  {
    id: 304,
    name: "razor-fang",
    category: "held-items",
    shortEffect:
      "Held: Damaging moves gain a 10% chance to make their target flinch. Held by a Gligar while levelling up: Holder evolves into Gliscor.",
  },
  {
    id: 581,
    name: "eviolite",
    category: "held-items",
    shortEffect:
      "Held: Holder has 1.5× Defense and Special Defense, as long as it’s not fully evolved.",
  },
  {
    id: 582,
    name: "float-stone",
    category: "held-items",
    shortEffect: "Held: Holder has 0.5× weight.",
  },
  {
    id: 583,
    name: "rocky-helmet",
    category: "held-items",
    shortEffect:
      "Held: When the holder is hit by a contact move, the attacking Pokémon takes 1/6 its max HP in damage.",
  },
  {
    id: 584,
    name: "air-balloon",
    category: "held-items",
    shortEffect:
      "Held: Grants immunity to Ground-type moves, Spikes, and Toxic Spikes. Consumed when the holder takes damage from a move.",
  },
  {
    id: 585,
    name: "red-card",
    category: "held-items",
    shortEffect:
      "Held: When the holder takes damage from a move, the opponent switches out for another random party Pokémon. Consumed after use.",
  },
  {
    id: 682,
    name: "weakness-policy",
    category: "held-items",
    shortEffect:
      "Held: When the holder is hit by a super effective move, its Attack and Special Attack raise by two stages.",
  },
  {
    id: 683,
    name: "assault-vest",
    category: "held-items",
    shortEffect:
      "Raises the holder’s Special Defense to 1.5×. Prevents the holder from selecting a status move.",
  },
  {
    id: 690,
    name: "safety-goggles",
    category: "held-items",
    shortEffect: "Held: Prevents damage from powder moves and the damage from Hail and Sandstorm.",
  },
  {
    id: 885,
    name: "ice-stone",
    category: "evolution",
    shortEffect:
      "Evolves an Alola Sandshrew into Alola Sandslash or an Alola Vulpix into Alola Ninetales.",
  },
];
