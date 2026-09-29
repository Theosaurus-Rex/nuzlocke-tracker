import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface EncounterDialogHeaderProps {
  title: string;
  tone?: "flag" | "alert";
}

export function EncounterDialogHeader({
  title,
  tone = "flag",
}: EncounterDialogHeaderProps): ReactNode {
  const alert = tone === "alert";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b-[1.5px] border-border px-4 py-3",
        alert ? "bg-destructive text-primary-foreground" : "bg-flag-tint",
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <DialogTitle render={<Typography variant="title" as="h2" className="truncate" />}>
          {title}
        </DialogTitle>
        {!alert && (
          <Typography as="p" variant="caption" tone="muted" aria-hidden="true" className="shrink-0">
            &middot; encounter
          </Typography>
        )}
      </div>
      <DialogClose
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Close"
            className={cn(alert && "text-foreground")}
          />
        }
      >
        <XIcon />
      </DialogClose>
    </div>
  );
}
