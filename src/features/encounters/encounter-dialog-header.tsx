import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";

export function EncounterDialogHeader({ title }: { title: string }): ReactNode {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b-[1.5px] border-border bg-flag-tint px-4 py-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <DialogTitle render={<Typography variant="title" as="h2" className="truncate" />}>
          {title}
        </DialogTitle>
        <Typography as="p" variant="caption" tone="muted" aria-hidden="true" className="shrink-0">
          &middot; encounter
        </Typography>
      </div>
      <DialogClose
        render={<Button type="button" variant="outline" size="icon" aria-label="Close" />}
      >
        <XIcon />
      </DialogClose>
    </div>
  );
}
