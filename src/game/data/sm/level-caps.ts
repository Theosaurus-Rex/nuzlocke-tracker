/**
 * Sun and Moon level caps by progress. Nuzlocke University has no Sun and Moon list, so these are
 * derived from the verified ace levels by its method: each trial or grand trial caps at its ace.
 * Alola has no badges, so every milestone waits on a fight.
 */

import type { LevelCapMilestone } from "@/domain/types";

export const levelCaps: LevelCapMilestone[] = [
  { cap: 12, until: { fight: "gym-ilima" } },
  { cap: 15, until: { fight: "gym-hala" } },
  { cap: 20, until: { fight: "gym-lana" } },
  { cap: 22, until: { fight: "gym-kiawe" } },
  { cap: 24, until: { fight: "gym-mallow" } },
  { cap: 27, until: { fight: "gym-olivia" } },
  // Sophocles' ace is 29. Held at 30 for Molayne, who comes first.
  { cap: 30, until: { fight: "gym-sophocles" } },
  { cap: 33, until: { fight: "gym-acerola" } },
  { cap: 39, until: { fight: "gym-nanu" } },
  { cap: 41, until: { fight: "boss-lusamine-1" } },
  { cap: 48, until: { fight: "gym-hapu" } },
  // Kommo-o's ace is 45. Held at 48 so the cap never goes down.
  { cap: 48, until: { fight: "gym-kommo-o" } },
  { cap: 50, until: { fight: "boss-lusamine-2" } },
  { cap: 54, until: { fight: "rival-hau-6" } },
  { cap: 55, until: { fight: "elite-four-hala" } },
  { cap: 55, until: { fight: "elite-four-olivia" } },
  { cap: 55, until: { fight: "elite-four-acerola" } },
  { cap: 55, until: { fight: "elite-four-kahili" } },
  { cap: 58, until: { fight: "champion-kukui" } },
];
