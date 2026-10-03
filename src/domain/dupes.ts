import type { Mon } from "./types";

export function findDupe(input: {
  line: readonly string[];
  mons: readonly Mon[];
}): Mon | undefined {
  const { line, mons } = input;
  return mons.find((mon) => line.includes(mon.speciesId) || line.includes(mon.speciesIdCaught));
}
