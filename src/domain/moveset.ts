import type { Moveset } from "./types";

export const MAX_MOVES = 4;

export function emptyMoveset(): Moveset {
  return [null, null, null, null];
}

export function padMoveset(moves: readonly (string | null)[]): Moveset {
  const padded = emptyMoveset();
  moves.slice(0, MAX_MOVES).forEach((move, index) => {
    padded[index] = move;
  });
  return padded;
}

export function isMoveset(value: unknown): value is Moveset {
  return (
    Array.isArray(value) &&
    value.length === MAX_MOVES &&
    value.every((move) => move === null || (typeof move === "string" && move !== ""))
  );
}
