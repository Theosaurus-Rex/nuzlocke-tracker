import type { Cause, Fight } from "@/domain/types";
import { moveDisplayName, speciesDisplayName } from "@/game/pokeapi/resolve";

export function titleCase(text: string): string {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function attackText(species: string, move: string | null): string {
  const name = speciesDisplayName(species);
  return move === null ? name : `${name} — ${moveDisplayName(move)}`;
}

export function causeText(cause: Cause, fights: readonly Fight[]): string {
  switch (cause.type) {
    case "trainer": {
      const owner = fights.find((fight) => fight.id === cause.fightId)?.name ?? cause.trainerName;
      const attack = attackText(cause.species, cause.move);
      return owner ? `${owner}'s ${attack}` : attack;
    }
    case "wild":
      return `wild ${attackText(cause.species, cause.move)}`;
    case "status":
      return titleCase(cause.status);
    case "other":
      return cause.detail;
  }
}
