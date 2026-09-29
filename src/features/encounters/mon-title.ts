import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

export function monTitle(mon: Mon): string {
  return mon.nickname !== null ? `“${mon.nickname}”` : speciesDisplayName(mon.speciesId);
}
