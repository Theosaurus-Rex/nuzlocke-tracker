import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { catchEncounter, killMon, missEncounter, skipEncounter } from "@/domain/transitions";
import type { Route } from "@/domain/types";
import { invalidateRun } from "@/storage/queries";
import { useStorage } from "@/storage/storage-context";
import type { StorageAdapter } from "@/storage/adapter";

const SEEDS = [
  { speciesId: "chikorita", kind: "caught-alive" },
  { speciesId: "sentret", kind: "caught-dead" },
  { speciesId: "geodude", kind: "missed" },
  { speciesId: "pidgey", kind: "skipped" },
  { speciesId: null, kind: "open" },
] as const;

async function seedEncounters(
  adapter: StorageAdapter,
  runId: string,
  routes: readonly Route[],
): Promise<void> {
  const targets = routes.slice(0, SEEDS.length);

  await adapter.transaction(async (tx) => {
    for (const [index, route] of targets.entries()) {
      const seed = SEEDS[index];
      if (seed === undefined) {
        continue;
      }

      const openEncounter = await tx.encounters.put({
        runId,
        routeId: route.id,
        status: "open",
        speciesId: null,
        level: null,
        monId: null,
        notes: null,
      });

      if (seed.kind === "caught-alive" || seed.kind === "caught-dead") {
        const { encounter, mon } = catchEncounter({
          encounter: openEncounter,
          party: [],
          monId: crypto.randomUUID(),
          details: {
            speciesId: seed.speciesId,
            level: 5,
            nickname: null,
            gender: null,
            nature: null,
            ability: null,
            heldItem: null,
            moves: [],
          },
        });

        const savedMon = await tx.mons.put(mon);
        await tx.encounters.put(encounter);

        if (seed.kind === "caught-dead") {
          const { mon: deadMon, death } = killMon({
            mon: savedMon,
            deathId: crypto.randomUUID(),
            details: {
              level: savedMon.level,
              routeId: route.id,
              cause: {
                type: "wild",
                species: seed.speciesId,
                level: savedMon.level,
                move: "Tackle",
              },
              diedAt: new Date().toISOString(),
              notes: null,
            },
          });

          await Promise.all([tx.mons.put(deadMon), tx.deaths.put(death)]);
        }
      } else if (seed.kind === "missed") {
        await tx.encounters.put(missEncounter({ ...openEncounter, speciesId: seed.speciesId }));
      } else if (seed.kind === "skipped") {
        await tx.encounters.put(skipEncounter({ ...openEncounter, speciesId: seed.speciesId }));
      }
    }
  });
}

interface DevSeedEncountersProps {
  runId: string;
  routes: readonly Route[];
}

function DevSeedEncountersButton({ runId, routes }: DevSeedEncountersProps) {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  const seed = useMutation({
    mutationFn: () => seedEncounters(adapter, runId, routes),
    onSuccess: () => invalidateRun(queryClient, runId),
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-4"
      disabled={seed.isPending || routes.length === 0}
      onClick={() => seed.mutate()}
    >
      Seed sample encounters
    </Button>
  );
}

export function DevSeedEncounters(props: DevSeedEncountersProps) {
  if (!import.meta.env.DEV) return null;

  return <DevSeedEncountersButton {...props} />;
}
