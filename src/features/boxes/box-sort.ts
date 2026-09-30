import type { Mon } from "@/domain/types";
import { speciesDisplayName, toNameForm } from "@/game/pokeapi/resolve";
import { TYPES, type Type } from "@/game/types";

export type BoxSort = "caught" | "level" | "name" | "type";

function displayedName(mon: Mon): string {
  return mon.nickname ?? speciesDisplayName(mon.speciesId);
}

function typeKey(types: readonly Type[] | undefined): [number, number] {
  const primary = types?.[0];
  if (primary === undefined) return [Number.POSITIVE_INFINITY, 0];
  const secondary = types?.[1];
  return [TYPES.indexOf(primary), secondary === undefined ? -1 : TYPES.indexOf(secondary)];
}

function compare(
  sort: BoxSort,
  a: Mon,
  b: Mon,
  typesById: ReadonlyMap<string, readonly Type[]>,
): number {
  switch (sort) {
    case "caught":
      return 0;
    case "level":
      return b.level - a.level;
    case "name":
      return displayedName(a).localeCompare(displayedName(b), undefined, { sensitivity: "base" });
    case "type": {
      const [primaryA, secondaryA] = typeKey(typesById.get(a.speciesId));
      const [primaryB, secondaryB] = typeKey(typesById.get(b.speciesId));
      if (primaryA !== primaryB) return primaryA < primaryB ? -1 : 1;
      return secondaryA - secondaryB;
    }
  }
}

export function sortBoxedMons(
  mons: readonly Mon[],
  sort: BoxSort,
  typesById: ReadonlyMap<string, readonly Type[]>,
): Mon[] {
  return mons
    .map((mon, index) => ({ mon, index }))
    .sort((a, b) => compare(sort, a.mon, b.mon, typesById) || a.index - b.index)
    .map(({ mon }) => mon);
}

export function searchMons(mons: readonly Mon[], query: string): Mon[] {
  const q = toNameForm(query);
  if (q === "") return [...mons];
  return mons.filter(
    (mon) =>
      (mon.nickname !== null && toNameForm(mon.nickname).startsWith(q)) ||
      toNameForm(speciesDisplayName(mon.speciesId)).startsWith(q),
  );
}
