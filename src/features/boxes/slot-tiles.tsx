import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import type { Mon } from "@/domain/types";
import { cn } from "@/lib/utils";

import { monTitle } from "../encounters/mon-title";

export const DROP_TARGET = "border-dashed border-border bg-flag-tint";

export function MonSprite({ mon, compact = false }: { mon: Mon; compact?: boolean }): ReactNode {
  return (
    <>
      <span className="md:hidden">
        <SpeciesSprite
          speciesId={mon.speciesId}
          shiny={mon.shiny}
          size={compact ? 40 : 48}
          placeholder={false}
        />
      </span>
      <span className="hidden md:block">
        <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={64} placeholder={false} />
      </span>
    </>
  );
}

export function FilledSlot({
  mon,
  dropId,
  compact,
  onEdit,
}: {
  mon: Mon;
  dropId: string;
  compact?: boolean;
  onEdit: (monId: string) => void;
}): ReactNode {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId });
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({ id: mon.id });
  return (
    <li ref={setDropRef} className="aspect-square">
      <button
        ref={setDragRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Edit ${monTitle(mon)}`}
        onClick={() => onEdit(mon.id)}
        // Stops the Space that drops a mon from also clicking the button.
        onKeyUp={(event) => {
          if (event.code === "Space") {
            event.preventDefault();
          }
        }}
        className={cn(
          "flex size-full cursor-pointer items-center justify-center border-[1.5px] border-border bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isDragging && "opacity-30",
          isOver && !isDragging && DROP_TARGET,
        )}
      >
        <MonSprite mon={mon} compact={compact} />
      </button>
    </li>
  );
}

export function EmptySlot({ dropId }: { dropId: string }): ReactNode {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <li
      ref={setNodeRef}
      aria-hidden="true"
      className={cn(
        "aspect-square border-[1.5px] border-dashed",
        isOver ? "border-border bg-flag-tint" : "border-placeholder",
      )}
    />
  );
}
