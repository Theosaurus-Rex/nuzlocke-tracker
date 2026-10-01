import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { MAX_PARTY_SIZE } from "@/domain/transitions";
import type { Mon } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useReorderParty } from "@/storage/mutations";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { useEditMonDialog } from "../encounters/use-edit-mon-dialog";
import { monTitle } from "../encounters/mon-title";
import { boxedMons } from "../boxes/boxes-screen";
import { AddToPartyDialog } from "./add-to-party-dialog";
import { PartyCard } from "./party-card";

function partySlotOrder(mon: Mon): number {
  return mon.partySlot ?? Number.POSITIVE_INFINITY;
}

export function partyMembers(mons: readonly Mon[]): Mon[] {
  return mons
    .filter((mon) => mon.status === "party")
    .sort((a, b) => {
      const orderA = partySlotOrder(a);
      const orderB = partySlotOrder(b);
      return orderA === orderB ? 0 : orderA - orderB;
    });
}

function announcementsFor(party: readonly Mon[]): Announcements {
  const name = (id: string | number): string => {
    const mon = party.find((m) => m.id === id);
    return mon === undefined ? "party member" : monTitle(mon);
  };
  const slot = (id: string | number | undefined): number => party.findIndex((m) => m.id === id) + 1;

  return {
    onDragStart: ({ active }) =>
      `Picked up ${name(active.id)}. Slot ${String(slot(active.id))} of ${String(party.length)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Moved ${name(active.id)} to slot ${String(slot(over.id))}.` : undefined,
    onDragEnd: ({ active, over }) =>
      `Dropped ${name(active.id)} in slot ${String(slot(over?.id ?? active.id))}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${name(active.id)} is back in slot ${String(slot(active.id))}.`,
  };
}

function orderedBy(party: Mon[], ids: readonly string[] | null): Mon[] {
  if (ids === null) {
    return party;
  }
  const byId = new Map(party.map((mon) => [mon.id, mon]));
  const ordered = ids.flatMap((id) => byId.get(id) ?? []);
  return ordered.length === party.length ? ordered : party;
}

function EmptySlotTile({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }): ReactNode {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="flex min-h-24 w-full cursor-pointer items-center justify-center border-[1.5px] border-dashed border-placeholder bg-transparent p-4 text-center text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent md:min-h-64"
      >
        {disabled ? "empty · box is empty" : "empty · add from box"}
      </button>
    </li>
  );
}

export function PartyScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const routesQuery = useRoutes(runId ?? "");
  const monsQuery = useMons(runId);
  const { openEditor, dialog } = useEditMonDialog(
    runId ?? "",
    monsQuery.data ?? [],
    routesQuery.data ?? [],
  );

  const reorder = useReorderParty();
  const [override, setOverride] = useState<string[] | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  const sensors = useSensors(
    // Not PointerSensor: touch fires pointer events too, so a swipe to scroll would start a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const party = orderedBy(partyMembers(monsQuery.data ?? []), override);
  const boxed = boxedMons(monsQuery.data ?? []);
  const freeSlots = Math.max(0, MAX_PARTY_SIZE - party.length);
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) {
      return;
    }
    const ids = party.map((mon) => mon.id);
    const orderedIds = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOverride(orderedIds);
    setSaveFailed(false);
    reorder.mutate(
      { runId, orderedIds },
      {
        onError: () => setSaveFailed(true),
        onSettled: () => setOverride(null),
      },
    );
  };

  return (
    <div>
      <ScreenHeader title="Party">
        {!monsQuery.isPending && (
          <Typography variant="body" tone="muted">
            {party.length} of {MAX_PARTY_SIZE}
          </Typography>
        )}
      </ScreenHeader>
      {!monsQuery.isPending && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements: announcementsFor(party) }}
        >
          <SortableContext items={party.map((mon) => mon.id)} strategy={rectSortingStrategy}>
            <ul className="grid gap-x-6 gap-y-14 p-4 pt-14 md:grid-cols-2">
              {party.map((mon) => (
                <PartyCard
                  key={mon.id}
                  mon={mon}
                  routeName={
                    mon.caughtRouteId === null ? null : (routeNames.get(mon.caughtRouteId) ?? null)
                  }
                  generation={generation}
                  onEdit={() => openEditor(mon.id)}
                />
              ))}
              {Array.from({ length: freeSlots }, (_, index) => (
                <EmptySlotTile
                  key={`empty-${String(index)}`}
                  disabled={boxed.length === 0}
                  onAdd={() => setPicking(true)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {saveFailed && (
        <Typography role="alert" variant="body" tone="alert" className="px-4">
          Could not save the new order. Nothing was changed.
        </Typography>
      )}
      {party.length > 0 && (
        <Typography variant="body" tone="muted" className="border-t-[1.5px] border-border p-4">
          <span className="hidden md:inline">Drag cards to reorder the party</span>
          <span className="md:hidden">Long-press a card to reorder the party</span>
        </Typography>
      )}
      {dialog}
      {picking && <AddToPartyDialog open onOpenChange={setPicking} boxed={boxed} />}
    </div>
  );
}
