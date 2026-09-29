import type { ReactNode } from "react";

import { CHIP_SHAPE } from "@/components/chip";
import { SpeciesSprite } from "@/components/species-sprite";
import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import type { Death, Fight, Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

import { causeText } from "./cause-text";

export interface DeathCardProps {
  death: Death;
  mon: Mon;
  routeName: string | null;
  fights: readonly Fight[];
  generation: number;
}

export function DeathCard({
  death,
  mon,
  routeName,
  fights,
  generation,
}: DeathCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = mon.nickname !== null ? `“${mon.nickname}” ${species}` : species;
  const where = routeName === null ? `L${death.level}` : `L${death.level} · ${routeName}`;

  return (
    <Surface
      as="li"
      className="grid grid-cols-[64px_1fr_auto] items-center gap-x-4 bg-card p-4 shadow-block-alert md:grid-cols-[64px_1fr_auto_auto]"
    >
      <SpeciesSprite
        speciesId={mon.speciesId}
        shiny={mon.shiny}
        size={64}
        className="row-span-2 grayscale md:row-span-1"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Typography as="h2" variant="title" className="break-words">
            {title}
          </Typography>
          <span className="hidden md:inline-flex">
            <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
          </span>
        </div>
        <Typography variant="body" tone="muted" className="mt-1">
          {where}
          <span className="hidden md:inline">{` · caught L${mon.levelCaught}`}</span>
        </Typography>
        <Typography variant="body" tone="alert" className="mt-1 break-words">
          {causeText(death.cause, fights)}
        </Typography>
      </div>
      <div className="col-start-3 row-start-1 self-start justify-self-end md:hidden">
        <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
      </div>
      <span
        className={`${CHIP_SHAPE} col-start-3 row-start-2 self-end justify-self-end bg-card md:col-start-4 md:row-start-1 md:self-center`}
      >
        {death.cause.type}
      </span>
    </Surface>
  );
}
