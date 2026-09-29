import type { ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";
import { EditMonButton } from "../encounters/edit-mon-button";
import { monTitle } from "../encounters/mon-title";

export interface BoxCardProps {
  mon: Mon;
  generation: number;
  onEdit: () => void;
}

export function BoxCard({ mon, generation, onEdit }: BoxCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = monTitle(mon);

  return (
    <Surface as="li" className="relative flex min-w-0 flex-col p-4">
      <SpeciesSprite
        speciesId={mon.speciesId}
        shiny={mon.shiny}
        size={96}
        placeholder={false}
        className="pointer-events-none absolute -top-8 -right-2"
      />
      <div className="pr-16">
        <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
        <Typography as="h2" variant="heading" className="mt-2 break-words uppercase">
          {title}
        </Typography>
      </div>
      <Typography variant="body" tone="muted" className="mt-1">
        {joinPresent([species, genderSymbol(mon.gender), `L${mon.level}`])}
        {mon.nature !== null && mon.nature !== "" && (
          <span className="hidden md:inline">{` · ${mon.nature}`}</span>
        )}
      </Typography>
      <Typography variant="body" className="mt-3 break-words border-t border-muted pt-3">
        <Typography as="span" variant="body" tone="ink">
          {mon.heldItem ?? "no item"}
        </Typography>
        {mon.ability !== null && mon.ability !== "" && (
          <Typography as="span" variant="body" tone="muted" className="hidden md:inline">
            {` · ${mon.ability}`}
          </Typography>
        )}
      </Typography>
      <EditMonButton mon={mon} onEdit={onEdit} />
    </Surface>
  );
}
