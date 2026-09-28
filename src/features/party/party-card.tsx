import type { ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";

import { MoveChip } from "./move-chip";

export interface PartyCardProps {
  mon: Mon;
  routeName: string | null;
  generation: number;
}

export function PartyCard({ mon, routeName, generation }: PartyCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = mon.nickname !== null ? `“${mon.nickname}”` : species;

  const itemText = mon.heldItem ?? "no item";
  const footerRest = joinPresent([mon.ability, routeName]);

  return (
    <Surface as="li" className="relative flex min-w-0 flex-col p-5">
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
        <Typography as="span" variant="body" tone="ink">
          {itemText}
        </Typography>
        {footerRest !== "" && (
          <Typography as="span" variant="body" tone="muted">
            {` · ${footerRest}`}
          </Typography>
        )}
      </Typography>
    </Surface>
  );
}
