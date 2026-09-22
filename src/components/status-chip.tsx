import type { ReactNode } from "react";

import { CHIP_SHAPE } from "./chip";
import { cn } from "@/lib/utils";

/**
 * Every status the tracker shows a chip for. It spans encounters, mons, fights and runs, so it
 * is its own union rather than reusing any one domain status type.
 */
export type StatusChipStatus =
  | "caught"
  | "party"
  | "active"
  | "cleared"
  | "fainted"
  | "failed"
  | "over-cap"
  | "pending"
  | "log"
  | "trainer"
  | "wild"
  | "boxed"
  | "complete"
  | "clause"
  | "missed";

type StatusChipGroup = "go" | "alert" | "flag" | "grid" | "white";

const STATUS_GROUP: Record<StatusChipStatus, StatusChipGroup> = {
  caught: "go",
  party: "go",
  active: "go",
  cleared: "go",
  fainted: "alert",
  failed: "alert",
  "over-cap": "alert",
  pending: "flag",
  log: "flag",
  trainer: "flag",
  wild: "flag",
  boxed: "grid",
  complete: "grid",
  clause: "grid",
  missed: "white",
};

const GROUP_CLASSES: Record<StatusChipGroup, string> = {
  go: "bg-primary text-primary-foreground",
  alert: "bg-destructive text-white",
  flag: "bg-flag text-foreground",
  grid: "bg-muted text-foreground",
  white: "bg-card text-foreground",
};

export interface StatusChipProps {
  status: StatusChipStatus;
  children?: ReactNode;
  className?: string;
}

export function StatusChip({ status, children, className }: StatusChipProps) {
  return (
    <span className={cn(CHIP_SHAPE, GROUP_CLASSES[STATUS_GROUP[status]], className)}>
      {children ?? status.replace("-", " ")}
    </span>
  );
}
