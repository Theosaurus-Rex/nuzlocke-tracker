import { Fragment, type ReactNode } from "react";
import { cn } from "cn";

import { BadgeSprite } from "@/components/badge-sprite";
import { StatusChip } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { canDeleteFight } from "@/domain/custom-fights";
import type { FightSection } from "@/domain/fight-list";
import type { Death, Fight, Mon } from "@/domain/types";

import { DeleteFightButton, LogAttemptButton, UndoClear } from "./fight-actions";
import { capLabel, fightLabel, lossNames } from "./loss-names";

export interface FightListProps {
  sections: FightSection[];
  monsById: ReadonlyMap<string, Mon>;
  onLog: (fight: Fight, label: string) => void;
  deaths: readonly Death[];
}

export function FightTable({ sections, monsById, onLog, deaths }: FightListProps): ReactNode {
  return (
    <table aria-label="Fights" className="w-full border-collapse bg-background text-left text-sm">
      <thead>
        <tr className="border-y-[1.5px] border-border bg-muted">
          {["Fight", "Cap", "Losses", "Status"].map((heading) => (
            <th key={heading} className="px-3 py-2">
              <Typography as="span" variant="eyebrow" tone="ink">
                {heading}
              </Typography>
            </th>
          ))}
        </tr>
      </thead>
      {sections.map((section) => (
        <tbody key={section.label}>
          <tr className="border-y-[1.5px] border-border bg-muted">
            <th colSpan={4} scope="colgroup" className="px-3 py-2 text-left">
              <Typography as="span" variant="eyebrow" tone="ink">
                {section.label}
              </Typography>
            </th>
          </tr>
          {section.rows.map(({ fight, badge, badgeSprite, state, losses }) => {
            const lost = lossNames(losses, monsById);
            const renderRow = (undoButton: ReactNode, confirm: ReactNode): ReactNode => (
              <Fragment key={fight.id}>
                <tr
                  aria-current={state === "next" ? "step" : undefined}
                  className={cn(
                    "border-b border-muted",
                    state === "next" && "bg-flag-tint",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="flex items-center gap-2">
                      <BadgeSprite sprite={badgeSprite} size={28} muted={state !== "cleared"} />
                      {fightLabel(fight.name, badge)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Typography as="span" variant="number">
                      {capLabel(fight.levelCap)}
                    </Typography>
                  </td>
                  <td className="px-3 py-2">
                    {lost.length > 0 ? (
                      <Typography as="span" variant="body" tone="alert">
                        {lost.join(", ")}
                      </Typography>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {state === "cleared" && (
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusChip status="cleared">Cleared</StatusChip>
                        {undoButton}
                      </span>
                    )}
                    <span className="flex flex-wrap items-center gap-2">
                      {state === "next" && (
                        <LogAttemptButton
                          fightName={fight.name}
                          onClick={() => onLog(fight, fightLabel(fight.name, badge))}
                        />
                      )}
                      {canDeleteFight(fight, deaths) && <DeleteFightButton fight={fight} />}
                    </span>
                  </td>
                </tr>
                {confirm !== null && (
                  <tr className="border-b border-muted">
                    <td colSpan={4} className="px-3 py-2">
                      {confirm}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
            return state === "cleared" ? (
              <UndoClear key={fight.id} fightId={fight.id} fightName={fight.name}>
                {renderRow}
              </UndoClear>
            ) : (
              renderRow(null, null)
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
