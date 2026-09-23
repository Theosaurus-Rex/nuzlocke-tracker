import { isType, type Type } from "@/game/types";

import { GENERATION_NUMBER, VERSION_GROUP_GENERATION } from "./generations";
import type { IndexEntry, Move, PastMoveValue, PastTypes, Species } from "./model";

interface NamedRef {
  name: string;
  url: string;
}

interface RawTypeSlot {
  slot: number;
  type: NamedRef;
}

export interface RawIndex {
  results: NamedRef[];
}

export interface RawPokemon {
  id: number;
  name: string;
  types: RawTypeSlot[];
  past_types: { generation: NamedRef; types: RawTypeSlot[] }[];
}

export interface RawMove {
  id: number;
  name: string;
  type: NamedRef;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  past_values: {
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    type: NamedRef | null;
    version_group: NamedRef;
  }[];
}

// PokéAPI numbers alternate forms (megas, regional forms) from 10001.
const FIRST_ALTERNATE_FORM_ID = 10001;

export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  if (match?.[1] === undefined) throw new Error(`no id in PokéAPI url ${url}`);
  return Number(match[1]);
}

function toType(ref: NamedRef): Type {
  return isType(ref.name) ? ref.name : "unknown";
}

function slotTypes(slots: RawTypeSlot[]): Type[] {
  return [...slots].sort((a, b) => a.slot - b.slot).map((s) => toType(s.type));
}

function toIndex(raw: RawIndex): IndexEntry[] {
  return raw.results
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .sort((a, b) => a.id - b.id);
}

export function toSpeciesIndex(raw: RawIndex): IndexEntry[] {
  return toIndex(raw).filter((entry) => entry.id < FIRST_ALTERNATE_FORM_ID);
}

export function toMoveIndex(raw: RawIndex): IndexEntry[] {
  return toIndex(raw);
}

export function toSpecies(raw: RawPokemon): Species {
  const pastTypes: PastTypes[] = raw.past_types
    .flatMap((entry) => {
      const generation = GENERATION_NUMBER[entry.generation.name];
      return generation === undefined
        ? []
        : [{ throughGeneration: generation, types: slotTypes(entry.types) }];
    })
    .sort((a, b) => a.throughGeneration - b.throughGeneration);

  return { id: raw.id, name: raw.name, types: slotTypes(raw.types), pastTypes };
}

export interface RawPokemonSpecies {
  id: number;
  name: string;
  evolution_chain: { url: string } | null;
}

export interface RawChainLink {
  species: NamedRef;
  evolves_to: RawChainLink[];
}

export interface RawEvolutionChain {
  id: number;
  chain: RawChainLink;
}

function findLink(link: RawChainLink, speciesId: number): RawChainLink | undefined {
  if (idFromUrl(link.species.url) === speciesId) return link;
  for (const child of link.evolves_to) {
    const found = findLink(child, speciesId);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function nextStages(chain: RawEvolutionChain, speciesId: number): number[] {
  const link = findLink(chain.chain, speciesId);
  return link === undefined ? [] : link.evolves_to.map((child) => idFromUrl(child.species.url));
}

export function toMove(raw: RawMove): Move {
  const pastValues: PastMoveValue[] = raw.past_values
    .flatMap((entry) => {
      const generation = VERSION_GROUP_GENERATION[entry.version_group.name];
      if (generation === undefined) return [];
      return [
        {
          throughGeneration: generation - 1,
          power: entry.power,
          accuracy: entry.accuracy,
          pp: entry.pp,
          type: entry.type === null ? null : toType(entry.type),
        },
      ];
    })
    .sort((a, b) => a.throughGeneration - b.throughGeneration);

  return {
    id: raw.id,
    name: raw.name,
    type: toType(raw.type),
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
    pastValues,
  };
}
