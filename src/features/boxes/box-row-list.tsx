import type { ReactNode } from "react";

import { ItemSprite } from "@/components/item-sprite";
import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { abilityDisplayName, itemDisplayName, speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";
import { EditMonButton } from "../encounters/edit-mon-button";
import { monTitle } from "../encounters/mon-title";

export interface BoxRowListProps {
  mons: Mon[];
  onEdit: (monId: string) => void;
}

export function BoxRowList({ mons, onEdit }: BoxRowListProps): ReactNode {
  return (
    <ul className="m-0 flex list-none flex-col border-[1.5px] border-border bg-card p-0">
      {mons.map((mon) => {
        const species = speciesDisplayName(mon.speciesId);
        const title = monTitle(mon);

        return (
          <li
            key={mon.id}
            className="relative flex items-center gap-3 border-b border-muted p-3 last:border-b-0"
          >
            <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} variant="icon" />
            <div className="min-w-0 flex-1 break-words">
              <Typography as="p" variant="title">
                {title}
              </Typography>
              <Typography as="p" variant="body" tone="muted">
                {joinPresent([species, genderSymbol(mon.gender), `L${mon.level}`])}
              </Typography>
              <div className="flex items-center gap-1.5">
                {mon.heldItem !== null && <ItemSprite item={mon.heldItem} />}
                <Typography as="p" variant="body" tone="muted">
                  {joinPresent([
                    mon.heldItem === null ? "no item" : itemDisplayName(mon.heldItem),
                    mon.ability === null ? null : abilityDisplayName(mon.ability),
                  ])}
                </Typography>
              </div>
            </div>
            <EditMonButton mon={mon} onEdit={() => onEdit(mon.id)} />
          </li>
        );
      })}
    </ul>
  );
}
