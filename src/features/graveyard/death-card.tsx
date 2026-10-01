import { ChevronDownIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { CHIP_SHAPE } from "@/components/chip";
import { SpeciesSprite } from "@/components/species-sprite";
import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import type { Death, Fight, Mon } from "@/domain/types";
import { monTitle } from "@/features/encounters/mon-title";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

import { causeText } from "./cause-text";
import { loggedAt, shortDate } from "./death-dates";

export interface DeathCardProps {
  death: Death;
  mon: Mon;
  caughtRouteName: string | null;
  fights: readonly Fight[];
  generation: number;
  onEdit: () => void;
}

function Level({ n }: { n: number }): ReactNode {
  return <Typography variant="number">L{n}</Typography>;
}

export function DeathCard({
  death,
  mon,
  caughtRouteName,
  fights,
  generation,
  onEdit,
}: DeathCardProps): ReactNode {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const species = speciesDisplayName(mon.speciesId);
  const title = mon.nickname !== null ? `“${mon.nickname}” ${species}` : species;

  return (
    <Surface as="li" className="bg-card p-4 shadow-block-alert">
      <div className="grid grid-cols-[40px_1fr] items-center gap-x-3 gap-y-3 md:grid-cols-[64px_1fr_auto] md:gap-x-4 md:gap-y-1">
        <SpeciesSprite
          speciesId={mon.speciesId}
          shiny={mon.shiny}
          size={64}
          className="size-10! grayscale md:row-span-2 md:size-16!"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 md:col-start-2 md:row-start-1 md:self-end">
          <Typography as="h2" variant="title" className="break-words">
            {title}
          </Typography>
          <span className="inline-flex basis-full md:basis-auto">
            <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
          </span>
        </div>
        <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-2 md:self-start">
          <Typography variant="body" tone="muted">
            <Level n={death.level} /> · caught <Level n={mon.levelCaught} />
            {caughtRouteName !== null && ` on ${caughtRouteName}`}
          </Typography>
          <Typography variant="body" tone="alert" className="mt-1 break-words">
            {causeText(death.cause, fights)}
          </Typography>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1 md:justify-end md:gap-4">
          <span className={`${CHIP_SHAPE} bg-card`}>{death.cause.type}</span>
          <span className="flex items-center gap-2">
            <Typography variant="number" tone="muted" className="uppercase">
              {shortDate(death.diedAt)}
            </Typography>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              aria-label={`Details for ${monTitle(mon)}`}
              className="-m-1 flex size-9 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => setOpen((value) => !value)}
            >
              <ChevronDownIcon
                aria-hidden
                strokeWidth={2.5}
                className={`size-6 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </span>
        </div>
      </div>
      {open && (
        <dl
          id={detailsId}
          className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-muted pt-3 md:flex md:items-end md:gap-x-8"
        >
          <div>
            <Typography as="dt" variant="eyebrow">
              Caught
            </Typography>
            <Typography as="dd" variant="body">
              {caughtRouteName ?? "Unknown route"} · <Level n={mon.levelCaught} />
            </Typography>
          </div>
          <div>
            <Typography as="dt" variant="eyebrow">
              Logged
            </Typography>
            <Typography as="dd" variant="number">
              {loggedAt(death.diedAt)}
            </Typography>
          </div>
          {death.notes !== null && (
            <div className="col-span-2 md:col-span-1">
              <Typography as="dt" variant="eyebrow">
                Notes
              </Typography>
              <Typography as="dd" variant="body">
                {death.notes}
              </Typography>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label={`Edit death of ${monTitle(mon)}`}
            className="col-span-2 w-full md:ml-auto md:w-auto"
            onClick={onEdit}
          >
            Edit
          </Button>
        </dl>
      )}
    </Surface>
  );
}
