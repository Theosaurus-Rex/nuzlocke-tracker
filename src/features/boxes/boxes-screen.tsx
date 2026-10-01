import { useMemo, useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { SearchInput } from "@/components/search-input";
import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { boxLayout } from "@/domain/box-slots";
import type { Mon } from "@/domain/types";
import { typesIn } from "@/game/pokeapi/resolve";
import { useSpeciesMany } from "@/game/pokeapi/queries";
import { GAMES } from "@/game/registry";
import type { Type } from "@/game/types";
import { cn } from "@/lib/utils";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { useEditMonDialog } from "../encounters/use-edit-mon-dialog";
import { BoxGrid } from "./box-grid";
import { searchMons, sortBoxedMons, type BoxSort } from "./box-sort";
import { BoxRowList } from "./box-row-list";
import { BoxTable } from "./box-table";
import { useBoxView, type BoxView } from "./use-box-view";

export function boxedMons(mons: readonly Mon[]): Mon[] {
  const layout = boxLayout(mons);
  return mons
    .filter((mon) => mon.status === "box")
    .sort((a, b) => (layout.get(a.id) ?? 0) - (layout.get(b.id) ?? 0));
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

const SORT_OPTIONS: readonly { sort: BoxSort; label: string }[] = [
  { sort: "caught", label: "Caught" },
  { sort: "level", label: "Level" },
  { sort: "name", label: "Name" },
  { sort: "type", label: "Type" },
];

const SORT_ITEMS = SORT_OPTIONS.map(({ sort, label }) => ({
  value: sort,
  label: `Sort: ${label}`,
}));

function SortSelect({
  sort,
  onChange,
}: {
  sort: BoxSort;
  onChange: (sort: BoxSort) => void;
}): ReactNode {
  return (
    <Select items={SORT_ITEMS} value={sort} onValueChange={(next) => onChange(next!)}>
      <SelectTrigger aria-label="Sort boxes" className="h-auto px-4 py-2 text-base font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.sort} value={option.sort}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BoxesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId ?? "");
  const [view, setView] = useBoxView();
  const [sort, setSort] = useState<BoxSort>("caught");
  const [search, setSearch] = useState("");
  const boxed = boxedMons(monsQuery.data ?? []);
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const routeNames = useMemo(
    () => new Map((routesQuery.data ?? []).map((route) => [route.id, route.name])),
    [routesQuery.data],
  );
  const speciesById = useSpeciesMany(boxed.map((mon) => mon.speciesId));
  const { openEditor, dialog } = useEditMonDialog(
    runId ?? "",
    monsQuery.data ?? [],
    routesQuery.data ?? [],
  );

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const typesById = new Map<string, Type[]>(
    [...speciesById].map(([id, species]) => [
      id,
      typesIn(species, generation).filter((type) => type !== "unknown"),
    ]),
  );
  const visible = sortBoxedMons(searchMons(boxed, search), sort, typesById);

  return (
    <div>
      <ScreenHeader
        title="Boxes"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            {view === "list" && <SortSelect sort={sort} onChange={setSort} />}
          </div>
        }
      >
        {!monsQuery.isPending && (
          <Typography variant="body" tone="muted">
            {boxed.length} stored
          </Typography>
        )}
      </ScreenHeader>
      {boxed.length > 0 && view === "list" && (
        <div className="border-b-[1.5px] border-border bg-background p-4">
          <div className="flex justify-end">
            <SearchInput
              id="box-search"
              label="Search boxes"
              value={search}
              onChange={setSearch}
              className="w-full sm:w-64"
            />
          </div>
        </div>
      )}
      {!monsQuery.isPending && boxed.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one in your boxes yet
        </Typography>
      )}
      {boxed.length > 0 && view === "list" && visible.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No boxed mons match “{search.trim()}”
        </Typography>
      )}
      {boxed.length > 0 && view === "grid" && (
        <BoxGrid runId={runId} mons={boxed} onEdit={openEditor} />
      )}
      {visible.length > 0 && view === "list" && (
        <>
          <div className="hidden md:block">
            <BoxTable mons={visible} routeNames={routeNames} onEdit={openEditor} />
          </div>
          <div className="md:hidden">
            <BoxRowList mons={visible} onEdit={openEditor} />
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
