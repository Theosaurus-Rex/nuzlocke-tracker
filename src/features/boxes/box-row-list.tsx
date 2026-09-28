import type { ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";

export interface BoxRowListProps {
  mons: Mon[];
}

export function BoxRowList({ mons }: BoxRowListProps): ReactNode {
  return (
    <ul className="m-0 flex list-none flex-col border-[1.5px] border-border bg-card p-0">
      {mons.map((mon) => {
        const species = speciesDisplayName(mon.speciesId);
        const title = mon.nickname !== null ? `“${mon.nickname}”` : species;

        return (
          <li
            key={mon.id}
            className="flex items-center gap-3 border-b border-muted p-3 last:border-b-0"
          >
            <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} variant="icon" />
            <div className="min-w-0 flex-1 break-words">
              <Typography as="p" variant="title">
                {title}
              </Typography>
              <Typography as="p" variant="body" tone="muted">
                {joinPresent([species, genderSymbol(mon.gender), `L${mon.level}`])}
              </Typography>
              <Typography as="p" variant="body" tone="muted">
                {joinPresent([mon.heldItem ?? "no item", mon.ability])}
              </Typography>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
