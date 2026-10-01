import type { ReactNode } from "react";

import { CHIP_SHAPE } from "@/components/chip";
import { Typography } from "@/components/typography";
import type { Death, Fight, Mon, Route } from "@/domain/types";

import { DeathCard } from "./death-card";
import type { Timeline } from "./timeline";

const NODE_BASE =
  "[&>li]:relative [&>li]:before:absolute [&>li]:before:top-1/2 [&>li]:before:z-10 [&>li]:before:size-3 [&>li]:before:-translate-y-1/2 [&>li]:before:content-[''] [&>li]:before:-left-[31px] md:[&>li]:before:-left-[39px] [&>li]:after:absolute [&>li]:after:top-1/2 [&>li]:after:h-0 [&>li]:after:content-[''] [&>li]:after:-left-[25px] [&>li]:after:w-[25px] md:[&>li]:after:-left-[33px] md:[&>li]:after:w-[33px]";
const SOLID_NODES = `${NODE_BASE} [&>li]:before:bg-destructive [&>li]:after:border-t-[1.5px] [&>li]:after:border-border`;

const SECTION = "relative pb-6 pl-8 md:pl-10";
const RAIL = "absolute top-0 bottom-0 left-[6px] border-l-2 border-border";
const MARKER = "absolute top-1/2 -left-8 size-3.5 -translate-y-1/2 md:-left-10";

export interface DeathTimelineProps {
  timeline: Timeline;
  routes: readonly Route[];
  monsById: ReadonlyMap<string, Mon>;
  fights: readonly Fight[];
  generation: number;
  onEdit: (deathId: string) => void;
}

export function DeathTimeline({
  timeline,
  routes,
  monsById,
  fights,
  generation,
  onEdit,
}: DeathTimelineProps): ReactNode {
  const routeNames = new Map(routes.map((route) => [route.id, route.name]));

  function cards(deaths: readonly Death[]): ReactNode {
    return deaths.map((death) => {
      const mon = monsById.get(death.monId);
      if (!mon) return null;
      return (
        <DeathCard
          key={death.id}
          death={death}
          mon={mon}
          caughtRouteName={
            mon.caughtRouteId === null ? null : (routeNames.get(mon.caughtRouteId) ?? null)
          }
          fights={fights}
          generation={generation}
          onEdit={() => onEdit(death.id)}
        />
      );
    });
  }

  const { sections, unrecorded } = timeline;

  return (
    <div className="p-4 pr-6">
      <ol aria-label="Deaths by route">
        {sections.map(({ route, position, total, deaths }) => (
          <li key={route.id} className={SECTION}>
            <span aria-hidden className={RAIL} />
            <div className="relative mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span aria-hidden className={`${MARKER} bg-border`} />
              <Typography as="h2" variant="title">
                {route.name}
              </Typography>
              <Typography variant="number" tone="muted" className="text-xs">
                {position}/{total}
              </Typography>
              {deaths.length > 1 && (
                <span className={`${CHIP_SHAPE} bg-secondary`}>{deaths.length} LOST</span>
              )}
            </div>
            <ul className={`grid gap-y-5 ${SOLID_NODES}`}>{cards(deaths)}</ul>
          </li>
        ))}
      </ol>
      {unrecorded.length > 0 && (
        <section className="mt-2 border-t border-muted pt-6">
          <Typography as="h2" variant="title" className="mb-3">
            Route not recorded
          </Typography>
          <ul className="grid gap-y-5">{cards(unrecorded)}</ul>
        </section>
      )}
    </div>
  );
}

export function TimelineEmpty(): ReactNode {
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center">
      <span
        aria-hidden
        className="mb-6 size-[70px] border-[1.5px] border-dashed border-placeholder"
      />
      <Typography as="h2" variant="heading">
        No one has fallen yet
      </Typography>
      <Typography variant="body" tone="muted" className="mt-2 max-w-sm">
        Deaths you log are placed on the route where they happened.
      </Typography>
    </div>
  );
}
