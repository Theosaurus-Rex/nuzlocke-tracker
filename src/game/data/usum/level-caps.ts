/**
 * Ultra Sun and Ultra Moon level caps by progress. Source: "Hardcore Nuzlocke Level Caps by
 * Generation", Nuzlocke University, https://nuzlockeuniversity.ca/2022/01/18/hardcore-nuzlocke-level-caps-by-generation/
 * Alola has no badges, so every milestone waits on a fight. The cap is held at 60 after Ultra
 * Necrozma so it never goes down, where the source falls back to 55 for Mina and Hapu.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 10, until: { fight: "rival-emily" } },
  { cap: 12, until: { fight: "gym-ilima" } },
  { cap: 16, until: { fight: "gym-hala" } },
  { cap: 20, until: { fight: "gym-lana" } },
  { cap: 22, until: { fight: "gym-kiawe" } },
  { cap: 24, until: { fight: "gym-mallow" } },
  { cap: 28, until: { fight: "gym-olivia" } },
  { cap: 33, until: { fight: "gym-sophocles" } },
  { cap: 35, until: { fight: "gym-acerola" } },
  { cap: 44, until: { fight: "gym-nanu" } },
  { cap: 49, until: { fight: "gym-kommo-o" } },
  { cap: 50, until: { fight: "boss-necrozma-1" } },
  { cap: 60, until: { fight: "champion-hau" } },
];
