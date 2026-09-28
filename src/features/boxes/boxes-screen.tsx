import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { cn } from "@/lib/utils";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { BoxCard } from "./box-card";
import { BoxRowList } from "./box-row-list";
import { BoxTable } from "./box-table";
import { useBoxView, type BoxView } from "./use-box-view";

function boxOrderOf(mon: Mon): number {
  return mon.boxOrder ?? Number.POSITIVE_INFINITY;
}

export function boxedMons(mons: readonly Mon[]): Mon[] {
  return mons
    .filter((mon) => mon.status === "box")
    .sort((a, b) => {
      const orderA = boxOrderOf(a);
      const orderB = boxOrderOf(b);
      if (orderA !== orderB) return orderA < orderB ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    });
}

const VIEW_OPTIONS: readonly { view: BoxView; label: string }[] = [
  { view: "grid", label: "Grid" },
  { view: "list", label: "List" },
];

function ViewToggle({
  view,
  onChange,
}: {
  view: BoxView;
  onChange: (view: BoxView) => void;
}): ReactNode {
  return (
    <div role="group" aria-label="Box view" className="flex items-center gap-3">
      {VIEW_OPTIONS.map((option) => {
        const active = option.view === view;
        return (
          <button
            key={option.view}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.view)}
            className={cn(
              "cursor-pointer border-[1.5px] px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-border bg-flag shadow-block"
                : "border-muted bg-background hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function BoxesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId ?? "");
  const [view, setView] = useBoxView();

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const boxed = boxedMons(monsQuery.data ?? []);
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));

  return (
    <div>
      <ScreenHeader title="Boxes" actions={<ViewToggle view={view} onChange={setView} />}>
        {!monsQuery.isPending && (
          <Typography variant="body" tone="muted">
            {boxed.length} stored
          </Typography>
        )}
      </ScreenHeader>
      {!monsQuery.isPending && boxed.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one in your boxes yet
        </Typography>
      )}
      {boxed.length > 0 && view === "grid" && (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-12 p-4 pt-12 lg:grid-cols-3">
          {boxed.map((mon) => (
            <BoxCard key={mon.id} mon={mon} generation={generation} />
          ))}
        </ul>
      )}
      {boxed.length > 0 && view === "list" && (
        <>
          <div className="hidden md:block">
            <BoxTable mons={boxed} routeNames={routeNames} />
          </div>
          <div className="md:hidden">
            <BoxRowList mons={boxed} />
          </div>
        </>
      )}
    </div>
  );
}
