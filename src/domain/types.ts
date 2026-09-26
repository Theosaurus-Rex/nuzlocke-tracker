/**
 * Entity types for the Nuzlocke tracker data model, no I/O. Nullable columns are `| null`,
 * never optional `?`: IndexedDB and the export bundle treat `undefined` and absent differently
 * from `null`.
 */

/** Ids are plain `string`. Branded id types are a deliberate omission, not an oversight. */

export interface Timestamped {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A row before it is persisted. `id`, `createdAt` and `updatedAt` are optional: supply them to
 * round-trip an existing row, or omit them and the storage adapter assigns and stamps them.
 */
export type Draft<T extends Timestamped> = Omit<T, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<T, "id" | "createdAt" | "updatedAt">>;

export type GameId = "heartgold";

export type RunStatus = "active" | "finished";

export type EncounterStatus = "open" | "caught" | "missed" | "skipped";

export type MonStatus = "party" | "box" | "dead";

export type FightKind = "gym" | "elite_four" | "champion" | "rival" | "custom";

export type FightStatus = "pending" | "cleared";

export type Gender = "male" | "female" | "genderless";

export interface Rules {
  dupesClause: boolean;
  speciesClause: boolean;
  shinyClause: boolean;
  nicknamesRequired: boolean;
  levelCaps: boolean;
  setMode: boolean;
  hardcore: boolean;
  randomiser: {
    enabled: boolean;
    wildEncounters: boolean;
    trainers: boolean;
    starters: boolean;
    abilities: boolean;
    items: boolean;
    moves: boolean;
    evolutions: boolean;
  };
  customClause: string | null;
}

export type ClauseField = Exclude<keyof Rules, "randomiser" | "customClause">;

export type RandomiserField = keyof Rules["randomiser"];

export type RandomiserSubField = Exclude<RandomiserField, "enabled">;

export type Run = Timestamped & {
  name: string;
  game: GameId;
  status: RunStatus;
  rules: Rules;
  finishedAt: string | null;
};

export type Route = Timestamped & {
  runId: string;
  name: string;
  /** Sparse integers, to leave room for insertion. */
  order: number;
  isCustom: boolean;
  /** Links back to seeded game data. Null when custom. */
  gameRouteId: string | null;
};

export type Encounter = Timestamped & {
  runId: string;
  routeId: string;
  status: EncounterStatus;
  /** What was met. Null while open. */
  speciesId: string | null;
  level: number | null;
  /** Set when caught. */
  monId: string | null;
  notes: string | null;
};

export type Mon = Timestamped & {
  runId: string;
  /** Null for starters and gifts. */
  encounterId: string | null;
  /** Current species. Mutates on evolve. */
  speciesId: string;
  /** Fixed at catch. */
  speciesIdCaught: string;
  /** Required when `rules.nicknamesRequired`. */
  nickname: string | null;
  gender: Gender | null;
  level: number;
  levelCaught: number;
  nature: string | null;
  ability: string | null;
  heldItem: string | null;
  /** Max 4, validated in `domain`. */
  moves: string[];
  status: MonStatus;
  /** 0–5. Set iff `status === 'party'`. */
  partySlot: number | null;
  boxOrder: number | null;
  caughtRouteId: string | null;
  shiny: boolean;
};

/** Status/residual-effect death causes. Deliberately incomplete. */
export type StatusCause =
  "poison" | "burn" | "sandstorm" | "hail" | "recoil" | "perish-song" | "confusion";

/** On the `trainer` variant, exactly one of `fightId` and `trainerName` is set. */
export type Cause =
  | {
      type: "trainer";
      fightId: string | null;
      trainerName: string | null;
      species: string;
      level: number;
      move: string;
    }
  | { type: "wild"; species: string; level: number; move: string }
  | { type: "status"; status: StatusCause }
  | { type: "other"; detail: string };

export type Death = Timestamped & {
  runId: string;
  /** One death per mon. */
  monId: string;
  level: number;
  routeId: string | null;
  cause: Cause;
  diedAt: string;
  notes: string | null;
};

export type Fight = Timestamped & {
  runId: string;
  /** Links to seeded roster data. Null when custom. */
  gameFightId: string | null;
  name: string;
  kind: FightKind;
  order: number;
  /** Drives the badge count. */
  grantsBadge: boolean;
  /** Derived from the boss's ace at ingest. */
  levelCap: number | null;
  status: FightStatus;
  clearedAt: string | null;
};
