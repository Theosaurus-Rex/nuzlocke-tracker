import { ArrowDown, ArrowUp } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useMons, useRoutes } from "@/storage/queries";

import { useEditMonDialog } from "../encounters/use-edit-mon-dialog";
import { BoxGrid } from "./box-grid";
import {
  BOX_SORT_FIELDS,
  searchMons,
  sortBoxedMons,
  type BoxSortField,
  type BoxSorting,
} from "./box-sort";
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

const CAUGHT = "caught";

const SORT_ITEMS = [
  { value: CAUGHT, label: "Sort: Caught" },
  ...BOX_SORT_FIELDS.map(({ field, label }) => ({ value: field, label: `Sort: ${label}` })),
];

function SortControl({
  sorting,
  onChange,
}: {
  sorting: BoxSorting | null;
  onChange: (sorting: BoxSorting | null) => void;
}): ReactNode {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <Select
        items={SORT_ITEMS}
        value={sorting?.field ?? CAUGHT}
        onValueChange={(next) =>
          onChange(
            next === CAUGHT || next === null
              ? null
              : { field: next as BoxSortField, desc: sorting?.desc ?? false },
          )
        }
      >
        <SelectTrigger aria-label="Sort boxes" className="h-auto px-4 py-2 text-base font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CAUGHT}>Caught</SelectItem>
          {BOX_SORT_FIELDS.map((option) => (
            <SelectItem key={option.field} value={option.field}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        aria-label="Sort descending"
        aria-pressed={sorting?.desc ?? false}
        disabled={sorting === null}
        onClick={() => sorting && onChange({ ...sorting, desc: !sorting.desc })}
        className={cn(
          "cursor-pointer border-[1.5px] border-border p-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-40",
          sorting?.desc && "bg-flag shadow-block",
        )}
      >
        {sorting?.desc ? (
          <ArrowDown aria-hidden="true" className="size-4" />
        ) : (
          <ArrowUp aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}

export function BoxesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId ?? "");
  const [view, setView] = useBoxView();
  const [sorting, setSorting] = useState<BoxSorting | null>(null);
  const [search, setSearch] = useState("");
  const boxed = boxedMons(monsQuery.data ?? []);
  const routeNames = useMemo(
    () => new Map((routesQuery.data ?? []).map((route) => [route.id, route.name])),
    [routesQuery.data],
  );
  const { openEditor, dialog } = useEditMonDialog(
    runId ?? "",
    monsQuery.data ?? [],
    routesQuery.data ?? [],
  );

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const visible = searchMons(boxed, search);

  return (
    <div>
      <ScreenHeader
        title="Boxes"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            {view === "list" && <SortControl sorting={sorting} onChange={setSorting} />}
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
            <BoxTable
              mons={visible}
              sorting={sorting}
              onSortingChange={setSorting}
              routeNames={routeNames}
              onEdit={openEditor}
            />
          </div>
          <div className="md:hidden">
            <BoxRowList mons={sortBoxedMons(visible, sorting)} onEdit={openEditor} />
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
