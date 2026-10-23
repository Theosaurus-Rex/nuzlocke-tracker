import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Typography } from "@/components/typography";
import { BOX_SIZE, boxLayout, moveBoxedMon } from "@/domain/box-slots";
import { placeMon, type PlaceTarget } from "@/domain/transitions";
import type { Mon } from "@/domain/types";
import { cn } from "@/lib/utils";
import { usePlaceMon, useMoveBoxedMon, type PlaceMonInput } from "@/storage/mutations";

import { monTitle } from "../encounters/mon-title";
import { partyId, slotId } from "./drop-ids";
import { PartyRow } from "./party-row";
import { DROP_TARGET, EmptySlot, FilledSlot, MonSprite } from "./slot-tiles";

const HOVER_SWITCH_MS = 500;

function boxId(box: number): string {
  return `box-${String(box)}`;
}

function parseId(
  id: UniqueIdentifier | undefined,
  prefix: "slot" | "box" | "party",
): number | null {
  if (typeof id !== "string" || !id.startsWith(`${prefix}-`)) {
    return null;
  }
  return Number(id.slice(prefix.length + 1));
}

function parseTarget(id: UniqueIdentifier | undefined): PlaceTarget | null {
  const party = parseId(id, "party");
  if (party !== null) return { kind: "party", slot: party };
  const box = parseId(id, "slot");
  return box === null ? null : { kind: "box", slot: box };
}

function describeSlot(slot: number): string {
  return `box ${String(Math.floor(slot / BOX_SIZE) + 1)}, slot ${String((slot % BOX_SIZE) + 1)}`;
}

function describeTarget(target: PlaceTarget): string {
  return target.kind === "party"
    ? `party slot ${String(target.slot + 1)}`
    : describeSlot(target.slot);
}

const SCREEN_READER_INSTRUCTIONS =
  "Press Space to pick up this Pokémon. Use the arrow keys to move to a box slot, a party slot or a box button. Press Space to drop it or Escape to cancel.";

const collisions: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};

const arrowCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const { collisionRect, droppableRects, droppableContainers } = context;
  if (!collisionRect) {
    return undefined;
  }
  const direction = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  }[event.code];
  if (!direction) {
    return undefined;
  }
  event.preventDefault();

  const from = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top + collisionRect.height / 2,
  };
  let best: { x: number; y: number; score: number } | null = null;
  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id);
    if (!rect) {
      continue;
    }
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const along = (center.x - from.x) * direction.x + (center.y - from.y) * direction.y;
    const across = Math.abs((center.x - from.x) * direction.y + (center.y - from.y) * direction.x);
    if (along <= 1) {
      continue;
    }
    const score = along + across * 2;
    if (best === null || score < best.score) {
      best = { ...center, score };
    }
  }
  if (best === null) {
    return undefined;
  }
  return {
    x: currentCoordinates.x + (best.x - from.x),
    y: currentCoordinates.y + (best.y - from.y),
  };
};

export interface BoxGridProps {
  runId: string;
  mons: readonly Mon[];
  party: readonly Mon[];
  onEdit: (monId: string) => void;
}

function boxCount(slots: Iterable<number>): number {
  const counts = new Map<number, number>();
  for (const slot of slots) {
    const box = Math.floor(slot / BOX_SIZE);
    counts.set(box, (counts.get(box) ?? 0) + 1);
  }
  if (counts.size === 0) return 1;
  const last = Math.max(...counts.keys());
  return last + 1 + (counts.get(last) === BOX_SIZE ? 1 : 0);
}

function BoxButton({
  box,
  current,
  onChange,
}: {
  box: number;
  current: boolean;
  onChange: (box: number) => void;
}): ReactNode {
  const { setNodeRef, isOver } = useDroppable({ id: boxId(box) });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={current}
      onClick={() => onChange(box)}
      className={cn(
        "cursor-pointer border-[1.5px] px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        current
          ? "border-border bg-flag shadow-block"
          : "border-muted bg-background hover:bg-muted",
        isOver && !current && DROP_TARGET,
      )}
    >
      {`Box ${String(box + 1)}`}
    </button>
  );
}

function BoxSwitcher({
  count,
  current,
  onChange,
}: {
  count: number;
  current: number;
  onChange: (box: number) => void;
}): ReactNode {
  return (
    <div role="group" aria-label="Choose box" className="flex flex-wrap items-center gap-3">
      {Array.from({ length: count }, (_, box) => (
        <BoxButton key={box} box={box} current={box === current} onChange={onChange} />
      ))}
    </div>
  );
}

type Pending =
  | { kind: "box"; monId: string; toSlot: number }
  | { kind: "place"; monId: string; to: PlaceTarget };

function withPending(mons: readonly Mon[], pending: Pending | undefined): readonly Mon[] {
  if (pending === undefined) return mons;
  try {
    const changed =
      pending.kind === "box"
        ? moveBoxedMon(mons, pending.monId, pending.toSlot)
        : placeMon(mons, pending.monId, pending.to);
    const moved = new Map(changed.map((mon) => [mon.id, mon]));
    return mons.map((mon) => moved.get(mon.id) ?? mon);
  } catch {
    return mons;
  }
}

function partySlots(mons: readonly Mon[]): Map<number, Mon> {
  const bySlot = new Map<number, Mon>();
  for (const mon of mons) {
    if (mon.status === "party" && mon.partySlot !== null && !bySlot.has(mon.partySlot)) {
      bySlot.set(mon.partySlot, mon);
    }
  }
  return bySlot;
}

export function BoxGrid({
  runId,
  mons: savedBox,
  party: savedParty,
  onEdit,
}: BoxGridProps): ReactNode {
  const [selected, setSelected] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const hasMoved = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const move = useMoveBoxedMon();
  const place = usePlaceMon();
  const pending: Pending | undefined = move.isPending
    ? { kind: "box", monId: move.variables.monId, toSlot: move.variables.toSlot }
    : place.isPending
      ? { kind: "place", monId: place.variables.monId, to: place.variables.to }
      : undefined;
  const everyone = withPending([...savedParty, ...savedBox], pending);
  const mons = everyone.filter((mon) => mon.status === "box");
  const partyBySlot = partySlots(everyone);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: arrowCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const clearHoverTimer = (): void => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  useEffect(() => clearHoverTimer, []);

  const layout = boxLayout(mons);
  const count = boxCount(layout.values());
  const current = Math.min(selected, count - 1);
  const first = current * BOX_SIZE;

  const bySlot = new Map<number, Mon>();
  for (const mon of mons) {
    const slot = layout.get(mon.id);
    if (slot !== undefined) bySlot.set(slot, mon);
  }
  const filled = [...bySlot.keys()].filter((slot) => Math.floor(slot / BOX_SIZE) === current);
  const lifted = everyone.find((mon) => mon.id === liftedId);

  const nameOf = (id: UniqueIdentifier): string => {
    const mon = everyone.find((m) => m.id === id);
    return mon === undefined ? "Pokémon" : monTitle(mon);
  };
  const placeOf = (id: UniqueIdentifier): PlaceTarget => {
    const mon = everyone.find((m) => m.id === id);
    if (mon?.status === "party" && mon.partySlot !== null) {
      return { kind: "party", slot: mon.partySlot };
    }
    return { kind: "box", slot: layout.get(String(id)) ?? 0 };
  };
  const dropIdOf = (target: PlaceTarget): string =>
    target.kind === "party" ? partyId(target.slot) : slotId(target.slot);
  const occupantAt = (target: PlaceTarget): Mon | undefined =>
    target.kind === "party" ? partyBySlot.get(target.slot) : bySlot.get(target.slot);

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      hasMoved.current = false;
      return `Picked up ${nameOf(active.id)}. ${capitalise(describeTarget(placeOf(active.id)))}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!hasMoved.current && over?.id === dropIdOf(placeOf(active.id))) {
        return undefined;
      }
      hasMoved.current = true;
      const target = parseTarget(over?.id);
      if (target !== null) {
        return `Over ${describeTarget(target)}.`;
      }
      const box = parseId(over?.id, "box");
      if (box === null) {
        return undefined;
      }
      return box === current
        ? `Over Box ${String(box + 1)}.`
        : `Over Box ${String(box + 1)}. Hold to open it.`;
    },
    onDragEnd: ({ active, over }) => {
      const target = parseTarget(over?.id);
      if (target === null || over?.id === dropIdOf(placeOf(active.id))) {
        return `${nameOf(active.id)} was not moved.`;
      }
      const occupant = occupantAt(target);
      return occupant
        ? `Swapped ${nameOf(active.id)} with ${monTitle(occupant)}.`
        : `Moved ${nameOf(active.id)} to ${describeTarget(target)}.`;
    },
    onDragCancel: ({ active }) =>
      `Cancelled. ${nameOf(active.id)} is back in ${describeTarget(placeOf(active.id))}.`,
  };

  const handleDragOver = ({ over }: DragOverEvent): void => {
    clearHoverTimer();
    const box = parseId(over?.id, "box");
    if (box !== null && box !== current) {
      hoverTimer.current = setTimeout(() => {
        hoverTimer.current = null;
        setSelected(box);
      }, HOVER_SWITCH_MS);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    clearHoverTimer();
    setLiftedId(null);
    const target = parseTarget(over?.id);
    if (target === null || over?.id === dropIdOf(placeOf(active.id))) {
      return;
    }
    setSaveFailed(false);
    const monId = String(active.id);
    const onError = (): void => setSaveFailed(true);
    if (target.kind === "box" && placeOf(active.id).kind === "box") {
      move.mutate({ runId, monId, toSlot: target.slot }, { onError });
    } else {
      const input: PlaceMonInput = { runId, monId, to: target };
      place.mutate(input, { onError });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisions}
      onDragStart={({ active }) => setLiftedId(String(active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        clearHoverTimer();
        setLiftedId(null);
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS },
      }}
    >
      <div className="flex flex-col gap-4 p-4 md:max-w-3xl">
        <PartyRow bySlot={partyBySlot} onEdit={onEdit} />
        {count > 1 && <BoxSwitcher count={count} current={current} onChange={setSelected} />}
        <div className="flex items-baseline justify-between">
          <Typography variant="eyebrow">{`Box ${String(current + 1)}`}</Typography>
          <Typography variant="number" tone="muted">
            {`${String(filled.length)} / ${String(BOX_SIZE)}`}
          </Typography>
        </div>
        <ul aria-label="Box slots" className="grid grid-cols-5 gap-2 md:grid-cols-6 md:gap-3">
          {Array.from({ length: BOX_SIZE }, (_, position) => {
            const slot = first + position;
            const mon = bySlot.get(slot);
            return mon ? (
              <FilledSlot key={slot} mon={mon} dropId={slotId(slot)} onEdit={onEdit} />
            ) : (
              <EmptySlot key={slot} dropId={slotId(slot)} />
            );
          })}
        </ul>
        {saveFailed && (
          <Typography role="alert" variant="body" tone="alert">
            Could not move that Pokémon. Nothing was changed.
          </Typography>
        )}
        <Typography variant="body" tone="muted">
          Tap a Pokémon to edit it. Long-press to pick it up, then drop it on any box or party slot
          to move it.
        </Typography>
      </div>
      <DragOverlay dropAnimation={null}>
        {lifted && (
          <div className="flex size-full -translate-x-1 -translate-y-1 -rotate-3 items-center justify-center border-[1.5px] border-border bg-flag-tint shadow-block">
            <MonSprite mon={lifted} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
