import { useState, type ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import { BOX_SIZE, boxLayout } from "@/domain/box-slots";
import type { Mon } from "@/domain/types";
import { cn } from "@/lib/utils";

import { monTitle } from "../encounters/mon-title";

export interface BoxGridProps {
  mons: readonly Mon[];
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
        <button
          key={box}
          type="button"
          aria-pressed={box === current}
          onClick={() => onChange(box)}
          className={cn(
            "cursor-pointer border-[1.5px] px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            box === current
              ? "border-border bg-flag shadow-block"
              : "border-muted bg-background hover:bg-muted",
          )}
        >
          {`Box ${box + 1}`}
        </button>
      ))}
    </div>
  );
}

export function BoxGrid({ mons, onEdit }: BoxGridProps): ReactNode {
  const [selected, setSelected] = useState(0);
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

  return (
    <div className="flex flex-col gap-4 p-4 md:max-w-3xl">
      {count > 1 && <BoxSwitcher count={count} current={current} onChange={setSelected} />}
      <div className="flex items-baseline justify-between">
        <Typography variant="eyebrow">{`Box ${current + 1}`}</Typography>
        <Typography variant="number" tone="muted">
          {`${filled.length} / ${BOX_SIZE}`}
        </Typography>
      </div>
      <ul className="grid grid-cols-5 gap-2 md:grid-cols-6 md:gap-3">
        {Array.from({ length: BOX_SIZE }, (_, position) => {
          const mon = bySlot.get(first + position);
          return mon ? (
            <li key={position} className="aspect-square">
              <button
                type="button"
                aria-label={`Edit ${monTitle(mon)}`}
                onClick={() => onEdit(mon.id)}
                className="flex size-full cursor-pointer items-center justify-center border-[1.5px] border-border bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="md:hidden">
                  <SpeciesSprite
                    speciesId={mon.speciesId}
                    shiny={mon.shiny}
                    size={48}
                    placeholder={false}
                  />
                </span>
                <span className="hidden md:block">
                  <SpeciesSprite
                    speciesId={mon.speciesId}
                    shiny={mon.shiny}
                    size={64}
                    placeholder={false}
                  />
                </span>
              </button>
            </li>
          ) : (
            <li
              key={position}
              aria-hidden="true"
              className="aspect-square border-[1.5px] border-dashed border-placeholder"
            />
          );
        })}
      </ul>
      <Typography variant="body" tone="muted">
        Tap a Pokémon to edit it.
      </Typography>
    </div>
  );
}
