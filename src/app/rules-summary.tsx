import type { ReactNode } from "react";
import { cn } from "cn";

import { CHIP_SHAPE } from "@/components/chip";
import { Typography } from "@/components/typography";
import { ruleChips } from "@/domain/rules-summary";
import type { Rules } from "@/domain/types";

const TONE_FILL = {
  neutral: "bg-muted text-foreground",
  flag: "bg-flag text-foreground",
} as const;

export interface RulesSummaryProps {
  rules: Rules;
  levelCap: number | null;
  className?: string;
}

export function RulesSummary({ rules, levelCap, className }: RulesSummaryProps): ReactNode {
  const chips = ruleChips(rules, levelCap);
  if (chips.length === 0 && rules.customClause === null) {
    return null;
  }
  return (
    <div data-slot="rules-summary" className={className}>
      <Typography as="p" variant="eyebrow" className="mb-1.5">
        Rules
      </Typography>
      <ul aria-label="Active rules" className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li key={chip.label} className={cn(CHIP_SHAPE, TONE_FILL[chip.tone])}>
            {chip.label}
          </li>
        ))}
      </ul>
      {rules.customClause !== null && (
        <Typography as="p" variant="caption" tone="muted" className="mt-1.5">
          {rules.customClause}
        </Typography>
      )}
    </div>
  );
}
