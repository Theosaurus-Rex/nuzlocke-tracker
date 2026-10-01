import { useState, type ReactNode } from "react";

import { SearchInput } from "@/components/search-input";
import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Mon } from "@/domain/types";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { monTitle } from "@/features/encounters/mon-title";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";
import { useMoveMonToParty } from "@/storage/mutations";

import { searchMons } from "../boxes/box-sort";

export interface AddToPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boxed: readonly Mon[];
}

function rowLabel(mon: Mon): string {
  const species = speciesDisplayName(mon.speciesId);
  return mon.nickname !== null ? `“${mon.nickname}” ${species}` : species;
}

export function AddToPartyDialog({ open, onOpenChange, boxed }: AddToPartyDialogProps): ReactNode {
  const move = useMoveMonToParty();
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState<Mon | null>(null);
  const matches = searchMons(boxed, query);

  const pick = (mon: Mon): void => {
    setFailed(null);
    move.mutate(
      { monId: mon.id },
      {
        onSuccess: () => onOpenChange(false),
        onError: () => setFailed(mon),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 flex h-full max-h-full w-full max-w-full flex-col gap-0 -translate-x-0 -translate-y-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <EncounterDialogHeader title="Add to party" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <SearchInput
            id="add-to-party-search"
            label="Search boxes"
            value={query}
            onChange={setQuery}
          />
          {matches.length === 0 ? (
            <Typography as="p" variant="body" tone="muted">
              No boxed mons match “{query}”
            </Typography>
          ) : (
            <ul className="flex flex-col gap-2">
              {matches.map((mon) => (
                <li key={mon.id}>
                  <button
                    type="button"
                    aria-label={`Add ${monTitle(mon)} to the party`}
                    disabled={move.isPending}
                    onClick={() => pick(mon)}
                    className="flex w-full cursor-pointer items-center gap-3 border-[1.5px] border-border bg-card px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} />
                    <span className="min-w-0 flex-1 truncate font-bold">{rowLabel(mon)}</span>
                    <span className="font-mono text-sm text-muted-foreground">L{mon.level}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {failed !== null && (
            <Typography as="p" role="alert" variant="body" tone="alert">
              Could not add {monTitle(failed)} to the party. Nothing was changed.
            </Typography>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
