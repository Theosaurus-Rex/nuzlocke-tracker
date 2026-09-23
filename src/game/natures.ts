// The 25 natures. Neutral ones raise and lower the same stat, so both are null.

export type StatName = "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";

export interface NatureDef {
  name: string;
  raises: StatName | null;
  lowers: StatName | null;
}

export const natures: NatureDef[] = [
  { name: "Hardy", raises: null, lowers: null },
  { name: "Lonely", raises: "attack", lowers: "defense" },
  { name: "Brave", raises: "attack", lowers: "speed" },
  { name: "Adamant", raises: "attack", lowers: "specialAttack" },
  { name: "Naughty", raises: "attack", lowers: "specialDefense" },
  { name: "Bold", raises: "defense", lowers: "attack" },
  { name: "Docile", raises: null, lowers: null },
  { name: "Relaxed", raises: "defense", lowers: "speed" },
  { name: "Impish", raises: "defense", lowers: "specialAttack" },
  { name: "Lax", raises: "defense", lowers: "specialDefense" },
  { name: "Timid", raises: "speed", lowers: "attack" },
  { name: "Hasty", raises: "speed", lowers: "defense" },
  { name: "Serious", raises: null, lowers: null },
  { name: "Jolly", raises: "speed", lowers: "specialAttack" },
  { name: "Naive", raises: "speed", lowers: "specialDefense" },
  { name: "Modest", raises: "specialAttack", lowers: "attack" },
  { name: "Mild", raises: "specialAttack", lowers: "defense" },
  { name: "Quiet", raises: "specialAttack", lowers: "speed" },
  { name: "Bashful", raises: null, lowers: null },
  { name: "Rash", raises: "specialAttack", lowers: "specialDefense" },
  { name: "Calm", raises: "specialDefense", lowers: "attack" },
  { name: "Gentle", raises: "specialDefense", lowers: "defense" },
  { name: "Sassy", raises: "specialDefense", lowers: "speed" },
  { name: "Careful", raises: "specialDefense", lowers: "specialAttack" },
  { name: "Quirky", raises: null, lowers: null },
];
