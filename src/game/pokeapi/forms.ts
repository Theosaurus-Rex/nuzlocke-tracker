import type { IndexEntry } from "./model";

// PokéAPI numbers alternate forms (megas, regional forms) from 10001.
export const FIRST_ALTERNATE_FORM_ID = 10001;

export const REGIONS = {
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
} as const;

export type Region = keyof typeof REGIONS;

const REGIONAL_NAME = /^(.+?)-(alola|galar|hisui|paldea)(?:-(.+))?$/;

// Battle and costume forms. Nobody catches these, so the picker leaves them out.
const UNCATCHABLE_VARIANTS = new Set(["cap", "zen"]);

export function regionalForm(name: string): { base: string; region: Region } | null {
  if (name.includes("totem")) return null;
  const match = REGIONAL_NAME.exec(name);
  const base = match?.[1];
  const region = match?.[2] as Region | undefined;
  if (base === undefined || region === undefined || UNCATCHABLE_VARIANTS.has(match?.[3] ?? ""))
    return null;
  return { base, region };
}

export function baseSpeciesId(index: readonly IndexEntry[], entry: IndexEntry): number | undefined {
  if (entry.id < FIRST_ALTERNATE_FORM_ID) return entry.id;
  const form = regionalForm(entry.name);
  if (form === null) return undefined;
  const defaults = index.filter((e) => e.id < FIRST_ALTERNATE_FORM_ID);
  return (
    defaults.find((e) => e.name === form.base) ??
    defaults.find((e) => e.name.startsWith(`${form.base}-`))
  )?.id;
}

export function expandNextStages(
  index: readonly IndexEntry[],
  current: IndexEntry,
  stageIds: readonly number[],
): IndexEntry[] {
  const region = regionalForm(current.name)?.region;
  const forms = index.filter((e) => regionalForm(e.name) !== null);
  return stageIds.flatMap((stageId) => {
    const base = index.find((e) => e.id === stageId);
    const stageForms = forms.filter((e) => baseSpeciesId(index, e) === stageId);
    if (region === undefined) return [...(base ? [base] : []), ...stageForms];
    const sameRegion = stageForms.filter((e) => regionalForm(e.name)?.region === region);
    return sameRegion.length > 0 ? sameRegion : base ? [base] : [];
  });
}
