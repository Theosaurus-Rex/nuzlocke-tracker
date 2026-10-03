import { useState, type ReactNode } from "react";
import { cn } from "cn";

import { CHIP_SHAPE } from "@/components/chip";
import { statusChipFill } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useUndoClearFight } from "@/storage/mutations";

export function LogAttemptButton({
  fightName,
  onClick,
}: {
  fightName: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={`Log attempt at ${fightName}`}
      onClick={onClick}
      className={cn(
        CHIP_SHAPE,
        statusChipFill("log"),
        "cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      Log
    </button>
  );
}

export function UndoClear({
  fightId,
  fightName,
}: {
  fightId: string;
  fightName: string;
}): ReactNode {
  const undo = useUndoClearFight();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Undo clear of ${fightName}`}
        onClick={() => setConfirming(true)}
      >
        Undo
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Typography as="span" variant="body">
        Mark {fightName} as not cleared?
      </Typography>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={undo.isPending}
        onClick={() => undo.mutate(fightId, { onSuccess: () => setConfirming(false) })}
      >
        Confirm undo
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={undo.isPending}
        onClick={() => setConfirming(false)}
      >
        Keep cleared
      </Button>
      {undo.isError && (
        <Typography as="span" role="alert" variant="body" tone="alert">
          Could not undo: {undo.error.message}
        </Typography>
      )}
    </span>
  );
}
