import type { Cause, Fight } from "@/domain/types";
import { moveDisplayName, speciesDisplayName } from "@/game/pokeapi/resolve";

function titleCase(text: string): string {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function causeText(cause: Cause, fights: readonly Fight[]): string {
  switch (cause.type) {
    case "trainer": {
      const owner = fights.find((fight) => fight.id === cause.fightId)?.name ?? cause.trainerName;
      const attack = `${speciesDisplayName(cause.species)} — ${moveDisplayName(cause.move)}`;
      return owner ? `${owner}'s ${attack}` : attack;
    }
    case "wild":
      return `wild ${speciesDisplayName(cause.species)} — ${moveDisplayName(cause.move)}`;
    case "status":
      return titleCase(cause.status);
    case "other":
      return cause.detail;
  }
}
