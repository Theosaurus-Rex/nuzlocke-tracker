/** Builds a dev-only run with a spread of party, boxed, dead and unresolved encounters. */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { DEFAULT_RULES } from "@/domain/rules";
import { compareRoutes } from "@/domain/routes";
import { catchEncounter, killMon, missEncounter, skipEncounter } from "@/domain/transitions";
import type { Cause, Fight, Gender, Mon, Run } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { persistAddCustomRoute, persistCreateRun } from "./mutations";
import { invalidateRun, queryKeys } from "./queries";
import { useStorage } from "./storage-context";

interface DeathPlan {
  cause: Cause;
  diedAt: string;
  fightGameId?: string;
}

const LAST_CLEARED_FIGHT_GAME_ID = "gym-bugsy";
const CLEARED_AT = "2026-09-01T11:00:00.000Z";

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
      ability: "blaze",
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
          trainerName: null,
          species: "scyther",
          level: 17,
          move: "fury-cutter",
        },
        diedAt: "2026-09-01T12:00:00.000Z",
        fightGameId: "gym-bugsy",
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
      ability: "sturdy",
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
      ability: "chlorophyll",
      heldItem: "miracle-seed",
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
        cause: { type: "wild", species: "zubat", level: 6, move: null },
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
      ability: "keen-eye",
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
      ability: "inner-focus",
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
      ability: "static",
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
      ability: "water-absorb",
      heldItem: "quick-claw",
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
      ability: "intimidate",
      heldItem: "quick-claw",
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
      ability: "keen-eye",
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
      ability: "damp",
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
      ability: "soundproof",
      heldItem: "magnet",
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
      ability: "insomnia",
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
      ability: "thick-fat",
      moves: ["tackle", "water-gun", "defense-curl", "bubble"],
    },
  },
  extra(21, "mr-mime", "Mime", 20, 9),
  extra(22, "nidoran-f", "Nido", 12, 10),
  extra(23, "snubbull", "Fluff", 14, undefined, {
    type: "status",
    status: "burn",
  }),
  extra(24, "deoxys-normal", "Helix", 30, 11),
  extra(25, "porygon-z", "Zed", 35, 12),
  extra(26, "genesect", "Gene", 40, 13),
  extra(27, "chespin", "Spike", 16, 14, undefined, ["vine-whip", "play-rough"]),
  extra(28, "flabebe", "Bloom", 18, 15),
  extra(29, "type-null", "Null", 25, 16),
  extra(30, "tapu-koko", "Koko", 50, 17, undefined, ["thunderbolt", "spirit-break"]),
  extra(31, "sirfetchd", "Leek", 42, 18),
  extra(32, "great-tusk", "Tusk", 45, undefined, { type: "other", detail: "Fell off a cliff" }),
  { route: 33, kind: "missed", species: "corviknight" },
  extra(34, "sandshrew", "Dusty", 15, 19),
  extra(35, "onix", "Slate", 16, 20),
  extra(36, "gastly", "Wisp", 17, 21),
  extra(37, "abra", "Blink", 14, 22),
  extra(38, "natu", "Tiki", 13, 23),
  extra(39, "aipom", "Swing", 15, 24),
  extra(40, "yanma", "Buzz", 16, 25),
  extra(41, "slowpoke", "Doze", 18, 26),
  extra(42, "drowzee", "Snooze", 17, 27),
  extra(43, "sunkern", "Seed", 10, 28),
  extra(44, "phanpy", "Trunk", 19, 29),
  extra(45, "houndour", "Cinder", 20, 30),
  extra(46, "teddiursa", "Honey", 18, 31),
  extra(47, "magnemite", "Bolt", 16, 32),
  extra(48, "krabby", "Pinch", 17, 33),
  extra(49, "tentacool", "Jelly", 19, 34),
];

function extra(
  route: number,
  species: string,
  nickname: string,
  level: number,
  boxOrder?: number,
  cause?: Cause,
  moves: string[] = ["tackle"],
): Plan {
  const death = cause && { cause, diedAt: `2026-09-01T12:${String(10 + route)}:00.000Z` };
  const mon: MonPlan = { species, nickname, level, levelCaught: level - 3, moves, boxOrder, death };
  return { route, kind: "caught", placement: "box", mon };
}

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
    box: mons,
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

function fightCause(death: DeathPlan, fights: readonly Fight[]): Cause {
  if (death.fightGameId === undefined || death.cause.type !== "trainer") {
    return death.cause;
  }
  const fight = fights.find((f) => f.gameFightId === death.fightGameId);
  if (fight === undefined) {
    throw new Error(
      `Sample run refers to fight ${death.fightGameId}, which the game does not have.`,
    );
  }
  return { ...death.cause, fightId: fight.id, trainerName: null };
}

export async function loadSampleRun(adapter: StorageAdapter): Promise<Run> {
  return adapter.transaction(async (tx) => {
    const run = await persistCreateRun(tx, {
      name: "Johto Hardcore",
      game: "heartgold",
      rules: DEFAULT_RULES,
    });
    const routes = (await tx.routes.where("runId", run.id)).sort(compareRoutes);

    const fights = (await tx.fights.where("runId", run.id)).sort((a, b) => a.order - b.order);
    const lastCleared = fights.find((fight) => fight.gameFightId === LAST_CLEARED_FIGHT_GAME_ID);
    if (lastCleared === undefined) {
      throw new Error(`Sample run needs fight ${LAST_CLEARED_FIGHT_GAME_ID}.`);
    }
    const cleared = fights.filter((fight) => fight.order <= lastCleared.order);
    for (const fight of cleared) {
      await tx.fights.put({ ...fight, status: "cleared", clearedAt: CLEARED_AT });
    }

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
      const cause = fightCause(death, fights);
      const killed = killMon({
        mon,
        deathId: crypto.randomUUID(),
        details: {
          level: mon.level,
          routeId: mon.caughtRouteId,
          cause,
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
