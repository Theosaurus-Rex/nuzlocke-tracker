import type { GameId } from "@/domain/types";
import { GAMES } from "@/game/registry";
import type { GameData } from "@/game/types";

export function overrideGame(id: GameId, patch: Partial<GameData>): () => void {
  const original = GAMES[id];
  GAMES[id] = { ...original, ...patch };
  return () => {
    GAMES[id] = original;
  };
}
