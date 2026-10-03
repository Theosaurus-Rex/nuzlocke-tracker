import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import type { KeyboardEventHandler, ReactNode } from "react";

import { ItemSprite } from "@/components/item-sprite";
import { SpeciesSprite } from "@/components/species-sprite";
import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import { StatusChip } from "@/components/status-chip";
import { isOverCap } from "@/domain/rules-summary";
import type { Mon } from "@/domain/types";
import { abilityDisplayName, itemDisplayName, speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";
import { cn } from "@/lib/utils";

import { EditMonButton } from "../encounters/edit-mon-button";
import { monTitle } from "../encounters/mon-title";
import { MoveChip } from "./move-chip";

export interface PartyCardProps {
  mon: Mon;
  routeName: string | null;
  generation: number;
  cap?: number | null;
  onEdit: () => void;
}

export function PartyCard({
  mon,
  routeName,
  generation,
  cap = null,
  onEdit,
}: PartyCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = monTitle(mon);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mon.id });
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const onHandleKeyDown = onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined;

  const itemText = mon.heldItem === null ? "no item" : itemDisplayName(mon.heldItem);
  const footerRest = joinPresent([
    mon.ability === null ? null : abilityDisplayName(mon.ability),
    routeName,
  ]);

  return (
    <Surface
      as="li"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex min-w-0 flex-col p-5", isDragging && "z-20 scale-[1.02]")}
      {...pointerListeners}
    >
      <SpeciesSprite
        speciesId={mon.speciesId}
        shiny={mon.shiny}
        size={192}
        placeholder={false}
        className="pointer-events-none absolute -top-16 -right-4"
      />
      <div className="pr-36">
        <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
        <Typography as="h2" variant="heading" className="mt-3 break-words uppercase">
          {title}
        </Typography>
      </div>
      <Typography variant="body" tone="muted" className="mt-1">
        {joinPresent([species, genderSymbol(mon.gender), `L${mon.level}`, mon.nature])}
      </Typography>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t-[1.5px] border-border pt-4">
        {mon.moves.map((move) => (
          <li key={move}>
            <MoveChip name={move} generation={generation} />
          </li>
        ))}
      </ul>
      <Typography variant="body" className="mt-4 break-words border-t border-muted pt-3">
        <span className="inline-flex items-center gap-1 align-middle">
          {mon.heldItem !== null && <ItemSprite item={mon.heldItem} />}
          <Typography as="span" variant="body" tone="ink">
            {itemText}
          </Typography>
        </span>
        {footerRest !== "" && (
          <Typography as="span" variant="body" tone="muted">
            {` · ${footerRest}`}
          </Typography>
        )}
      </Typography>
      <EditMonButton mon={mon} onEdit={onEdit} />
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reorder ${title}`}
        onKeyDown={onHandleKeyDown}
        {...attributes}
        className="absolute top-1 left-1 z-20 cursor-grab p-0.5 text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
      {cap !== null && isOverCap(mon.level, cap) && (
        <StatusChip
          status="pending"
          className="pointer-events-none absolute -bottom-3 left-3 uppercase"
        >{`Over cap L${String(cap)}`}</StatusChip>
      )}
    </Surface>
  );
}
