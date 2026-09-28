/** Builds a dev-only run with a spread of party, boxed, dead and unresolved encounters. */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { DEFAULT_RULES } from "@/domain/rules";
import { compareRoutes } from "@/domain/routes";
import { catchEncounter, killMon, missEncounter, skipEncounter } from "@/domain/transitions";
import type { Cause, Gender, Mon, Run } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { persistAddCustomRoute, persistCreateRun } from "./mutations";
import { invalidateRun, queryKeys } from "./queries";
import { useStorage } from "./storage-context";

interface DeathPlan {
  cause: Cause;
  diedAt: string;
}

interface MonPlan {
  species: string;
  nickname: string;
  level: number;
  levelCaught: number;
  moves: string[];
  gender?: Gender;
  nature?: string;
  ability?: string;
  heldItem?: string;
  shiny?: boolean;
  boxOrder?: number;
  death?: DeathPlan;
}

type Outcome =
  | { kind: "caught"; placement: "party" | "box"; mon: MonPlan }
  | { kind: "missed" | "skipped"; species: string | null };

type Plan = { route: number } & Outcome;

const PLANS: Plan[] = [
  {
    route: 0,
    kind: "caught",
    placement: "party",
    mon: {
      species: "cyndaquil",
      nickname: "Ember",
      level: 14,
      levelCaught: 5,
      gender: "male",
      nature: "Modest",
      ability: "Blaze",
      moves: ["tackle", "leer", "smokescreen", "ember"],
    },
  },
  { route: 1, kind: "skipped", species: null },
  {
    route: 2,
    kind: "caught",
    placement: "party",
    mon: {
      species: "sentret",
      nickname: "Scout",
      level: 7,
      levelCaught: 3,
      gender: "female",
      moves: ["scratch", "foresight"],
      death: {
        cause: {
          type: "trainer",
          fightId: null,
          trainerName: "Youngster Joey",
          species: "rattata",
          level: 4,
          move: "tackle",
        },
        diedAt: "2026-09-01T12:00:00.000Z",
      },
    },
  },
  {
    route: 3,
    kind: "caught",
    placement: "party",
    mon: {
      species: "geodude",
      nickname: "Rocky",
      level: 11,
      levelCaught: 6,
      gender: "male",
      nature: "Adamant",
      ability: "Sturdy",
      moves: ["tackle", "defense-curl", "rock-throw"],
    },
  },
  {
    route: 4,
    kind: "caught",
    placement: "box",
    mon: {
      species: "bellsprout",
      nickname: "Sprig",
      level: 18,
      levelCaught: 5,
      gender: "male",
      nature: "Jolly",
      ability: "Chlorophyll",
      heldItem: "Miracle Seed",
      moves: ["vine-whip", "growth"],
      boxOrder: 0,
    },
  },
  {
    route: 5,
    kind: "caught",
    placement: "box",
    mon: {
      species: "caterpie",
      nickname: "Wiggly",
      level: 5,
      levelCaught: 3,
      moves: ["tackle", "string-shot"],
      death: {
        cause: { type: "wild", species: "zubat", level: 6, move: "wing-attack" },
        diedAt: "2026-09-01T12:01:00.000Z",
      },
    },
  },
  { route: 6, kind: "missed", species: "rattata" },
  {
    route: 7,
    kind: "caught",
    placement: "box",
    mon: {
      species: "pidgey",
      nickname: "Pip",
      level: 9,
      levelCaught: 4,
      gender: "female",
      nature: "Hasty",
      ability: "Keen Eye",
      moves: ["tackle", "gust"],
      boxOrder: 3,
    },
  },
  {
    route: 8,
    kind: "caught",
    placement: "box",
    mon: {
      species: "zubat",
      nickname: "Zubb",
      level: 11,
      levelCaught: 6,
      gender: "female",
      nature: "Timid",
      ability: "Inner Focus",
      moves: ["leech-life", "supersonic"],
      boxOrder: 1,
    },
  },
  {
    route: 9,
    kind: "caught",
    placement: "party",
    mon: {
      species: "mareep",
      nickname: "Volt",
      level: 13,
      levelCaught: 7,
      gender: "female",
      nature: "Calm",
      ability: "Static",
      moves: ["tackle", "growl", "thundershock"],
    },
  },
  { route: 10, kind: "skipped", species: "rattata" },
  {
    route: 11,
    kind: "caught",
    placement: "box",
    mon: {
      species: "wooper",
      nickname: "Mud",
      level: 13,
      levelCaught: 8,
      gender: "male",
      nature: "Relaxed",
      ability: "Water Absorb",
      heldItem: "Quick Claw",
      moves: ["water-gun", "tail-whip"],
      boxOrder: 2,
    },
  },
  {
    route: 12,
    kind: "caught",
    placement: "box",
    mon: {
      species: "ledyba",
      nickname: "Burnie",
      level: 8,
      levelCaught: 5,
      moves: ["tackle", "supersonic"],
      death: { cause: { type: "status", status: "poison" }, diedAt: "2026-09-01T12:02:00.000Z" },
    },
  },
  {
    route: 13,
    kind: "caught",
    placement: "box",
    mon: {
      species: "ekans",
      nickname: "Coil",
      level: 14,
      levelCaught: 9,
      gender: "male",
      nature: "Lonely",
      ability: "Intimidate",
      heldItem: "Quick Claw",
      moves: ["wrap", "leer", "poison-sting"],
      boxOrder: 8,
    },
  },
  {
    route: 14,
    kind: "caught",
    placement: "box",
    mon: {
      species: "spearow",
      nickname: "Nut",
      level: 8,
      levelCaught: 4,
      gender: "male",
      nature: "Adamant",
      ability: "Keen Eye",
      moves: ["peck", "growl"],
      boxOrder: 6,
    },
  },
  {
    route: 15,
    kind: "caught",
    placement: "box",
    mon: {
      species: "poliwag",
      nickname: "Fizz",
      level: 12,
      levelCaught: 8,
      gender: "male",
      nature: "Bold",
      ability: "Damp",
      moves: ["water-gun", "hypnosis"],
      boxOrder: 5,
    },
  },
  { route: 16, kind: "missed", species: "zubat" },
  {
    route: 17,
    kind: "caught",
    placement: "box",
    mon: {
      species: "voltorb",
      nickname: "Tock",
      level: 15,
      levelCaught: 10,
      gender: "genderless",
      nature: "Naive",
      ability: "Soundproof",
      heldItem: "Magnet",
      moves: ["tackle", "screech", "sonic-boom"],
      shiny: true,
      boxOrder: 4,
    },
  },
  {
    route: 18,
    kind: "caught",
    placement: "box",
    mon: {
      species: "hoothoot",
      nickname: "Bram",
      level: 10,
      levelCaught: 5,
      gender: "female",
      nature: "Calm",
      ability: "Insomnia",
      moves: ["tackle", "growl", "foresight"],
      boxOrder: 7,
    },
  },
  {
    route: 19,
    kind: "caught",
    placement: "box",
    mon: {
      species: "hoppip",
      nickname: "Drift",
      level: 9,
      levelCaught: 6,
      moves: ["splash", "synthesis"],
      death: {
        cause: { type: "other", detail: "Crit on the switch-in" },
        diedAt: "2026-09-01T12:03:00.000Z",
      },
    },
  },
  {
    route: 20,
    kind: "caught",
    placement: "party",
    mon: {
      species: "marill",
      nickname: "Bubbles",
      level: 15,
      levelCaught: 10,
      gender: "female",
      nature: "Impish",
      ability: "Thick Fat",
      moves: ["tackle", "water-gun", "defense-curl", "bubble"],
    },
  },
];

const CUSTOM_ROUTE_NAME = "Headbutt tree by Route 30";
const CUSTOM_ROUTE_OUTCOME: Outcome = { kind: "missed", species: "heracross" };

async function resolveEncounter(
  tx: StorageAdapter,
  runId: string,
  routeId: string,
  outcome: Outcome,
  mons: readonly Mon[],
): Promise<Mon | null> {
  const open = await tx.encounters.put({
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
  });

  if (outcome.kind !== "caught") {
    const seen = { ...open, speciesId: outcome.species };
    await tx.encounters.put(outcome.kind === "missed" ? missEncounter(seen) : skipEncounter(seen));
    return null;
  }

  const plan = outcome.mon;
  const { encounter, mon } = catchEncounter({
    encounter: open,
    party: mons,
    monId: crypto.randomUUID(),
    details: {
      speciesId: plan.species,
      levelCaught: plan.levelCaught,
      level: plan.level,
      placement: outcome.placement,
      nickname: plan.nickname,
      gender: plan.gender ?? null,
      nature: plan.nature ?? null,
      ability: plan.ability ?? null,
      heldItem: plan.heldItem ?? null,
      moves: plan.moves,
      shiny: plan.shiny ?? false,
    },
  });

  await tx.encounters.put(encounter);
  return tx.mons.put({ ...mon, boxOrder: plan.boxOrder ?? null });
}

export async function loadSampleRun(adapter: StorageAdapter): Promise<Run> {
  return adapter.transaction(async (tx) => {
    const run = await persistCreateRun(tx, {
      name: "Johto Hardcore",
      game: "heartgold",
      rules: DEFAULT_RULES,
    });
    const routes = (await tx.routes.where("runId", run.id)).sort(compareRoutes);

    const mons: Mon[] = [];
    const doomed: { mon: Mon; death: DeathPlan }[] = [];

    for (const plan of PLANS) {
      const route = routes[plan.route];
      if (route === undefined) {
        throw new Error(`Sample run refers to route ${plan.route}, which the game does not have.`);
      }
      const mon = await resolveEncounter(tx, run.id, route.id, plan, mons);
      if (mon !== null) {
        mons.push(mon);
        if (plan.kind === "caught" && plan.mon.death) {
          doomed.push({ mon, death: plan.mon.death });
        }
      }
    }

    const custom = await persistAddCustomRoute(tx, {
      runId: run.id,
      name: CUSTOM_ROUTE_NAME,
      routes,
    });
    await resolveEncounter(tx, run.id, custom.id, CUSTOM_ROUTE_OUTCOME, mons);

    // Deaths come last so the party slot they free stays a gap while the party is being built.
    for (const { mon, death } of doomed) {
      const killed = killMon({
        mon,
        deathId: crypto.randomUUID(),
        details: {
          level: mon.level,
          routeId: mon.caughtRouteId,
          cause: death.cause,
          diedAt: death.diedAt,
          notes: null,
        },
      });
      await tx.mons.put(killed.mon);
      await tx.deaths.put(killed.death);
    }

    return run;
  });
}

export function useLoadSampleRun(): UseMutationResult<Run, Error, void> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => loadSampleRun(adapter),
    onSuccess: async (run) => {
      await Promise.all([
        invalidateRun(queryClient, run.id),
        queryClient.invalidateQueries({ queryKey: queryKeys.runs() }),
      ]);
    },
  });
}
