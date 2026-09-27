import type { Type } from "@/game/types";

export interface IndexEntry {
  id: number;
  name: string;
}

export interface PastTypes {
  throughGeneration: number;
  types: Type[];
}

export interface SpeciesSprites {
  animated: string | null;
  animatedShiny: string | null;
  still: string | null;
  stillShiny: string | null;
}

export interface Species {
  id: number;
  name: string;
  types: Type[];
  pastTypes: PastTypes[];
  sprites: SpeciesSprites;
}

export interface PastMoveValue {
  throughGeneration: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Type | null;
}

export interface Move {
  id: number;
  name: string;
  type: Type;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  pastValues: PastMoveValue[];
}
