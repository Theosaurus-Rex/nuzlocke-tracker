import type { ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";

import { MoveChip } from "./move-chip";

export interface PartyCardProps {
  mon: Mon;
  routeName: string | null;
  generation: number;
}

function joinPresent(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null && part !== "").join(" · ");
}

export function PartyCard({ mon, routeName, generation }: PartyCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = mon.nickname !== null ? `“${mon.nickname}”` : species;

  return (
    <Surface as="li" className="flex flex-col p-5">
      <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
      <Typography as="h2" variant="title" className="mt-3 uppercase">
        {title}
      </Typography>
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
      <Typography variant="body" className="mt-4 border-t border-border/30 pt-3">
        {joinPresent([mon.heldItem ?? "no item", mon.ability, routeName])}
      </Typography>
    </Surface>
  );
}
