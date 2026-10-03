import type { ReactNode } from "react";
import { cn } from "cn";

import { BadgeSprite } from "@/components/badge-sprite";
import { StatusChip } from "@/components/status-chip";
import { Typography } from "@/components/typography";

import { LogAttemptButton, UndoClear } from "./fight-actions";
import type { FightListProps } from "./fight-table";
import { capLabel, fightLabel, lossNames } from "./loss-names";

export function FightCardList({ sections, monsById, onLog }: FightListProps): ReactNode {
  return (
    <div aria-label="Fights" role="group" className="border-b-[1.5px] border-border bg-card">
      {sections.map((section) => (
        <section key={section.label} aria-label={section.label}>
          <div className="border-y-[1.5px] border-border bg-muted px-3 py-2">
            <Typography as="span" variant="eyebrow" tone="ink">
              {section.label}
            </Typography>
          </div>
          <ul className="m-0 list-none p-0">
            {section.rows.map(({ fight, badge, badgeSprite, state, losses }) => {
              const lost = lossNames(losses, monsById);
              const renderRow = (undoButton: ReactNode, confirm: ReactNode): ReactNode => (
                <li
                  key={fight.id}
                  aria-current={state === "next" ? "step" : undefined}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 border-b border-muted p-3",
                    state === "next" && "bg-flag-tint",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  <BadgeSprite sprite={badgeSprite} size={32} muted={state !== "cleared"} />
                  <div className="min-w-0 flex-1">
                    <Typography
                      as="p"
                      variant="title"
                      tone={state === "upcoming" ? "muted" : undefined}
                    >
                      {fightLabel(fight.name, badge)}
                    </Typography>
                    {lost.length > 0 && (
                      <Typography as="p" variant="caption" tone="alert">
                        {lost.join(", ")}
                      </Typography>
                    )}
                  </div>
                  <Typography as="span" variant="number">
                    {capLabel(fight.levelCap)}
                  </Typography>
                  {state === "cleared" && (
                    <StatusChip status="cleared">
                      <span aria-hidden="true">✓</span>
                      <span className="sr-only">Cleared</span>
                    </StatusChip>
                  )}
                  {undoButton}
                  {state === "next" && (
                    <LogAttemptButton
                      fightName={fight.name}
                      onClick={() => onLog(fight, fightLabel(fight.name, badge))}
                    />
                  )}
                  {confirm}
                </li>
              );
              return state === "cleared" ? (
                <UndoClear key={fight.id} fightId={fight.id} fightName={fight.name}>
                  {renderRow}
                </UndoClear>
              ) : (
                renderRow(null, null)
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
