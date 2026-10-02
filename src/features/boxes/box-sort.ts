import type { Mon } from "@/domain/types";
import {
  abilityDisplayName,
  itemDisplayName,
  speciesDisplayName,
  toNameForm,
} from "@/game/pokeapi/resolve";

export type BoxSortField = "name" | "species" | "level" | "gender" | "nature" | "ability" | "item";

export interface BoxSorting {
  field: BoxSortField;
  desc: boolean;
}

export const BOX_SORT_FIELDS: readonly { field: BoxSortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "species", label: "Species" },
  { field: "level", label: "Level" },
  { field: "gender", label: "Gender" },
  { field: "nature", label: "Nature" },
  { field: "ability", label: "Ability" },
  { field: "item", label: "Item" },
];

function present(value: string | null): string | undefined {
  return value === null || value === "" ? undefined : value;
}

export function boxSortValue(mon: Mon, field: BoxSortField): string | number | undefined {
  switch (field) {
    case "name":
      return mon.nickname ?? speciesDisplayName(mon.speciesId);
    case "species":
      return speciesDisplayName(mon.speciesId);
    case "level":
      return mon.level;
    case "gender":
      return present(mon.gender);
    case "nature":
      return present(mon.nature);
    case "ability":
      return present(mon.ability === null ? null : abilityDisplayName(mon.ability));
    case "item":
      return present(mon.heldItem === null ? null : itemDisplayName(mon.heldItem));
  }
}

export function compareBoxSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

export function sortBoxedMons(mons: readonly Mon[], sorting: BoxSorting | null): Mon[] {
  if (sorting === null) return [...mons];
  const { field, desc } = sorting;
  return mons
    .map((mon) => ({ mon, value: boxSortValue(mon, field) }))
    .sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        if (a.value === b.value) return 0;
        return a.value === undefined ? 1 : -1;
      }
      const order = compareBoxSortValues(a.value, b.value);
      return desc ? -order : order;
    })
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
