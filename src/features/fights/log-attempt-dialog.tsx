import { useState, type FormEvent, type ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { SquareCheckbox } from "@/components/square-checkbox";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Mon } from "@/domain/types";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { monTitle } from "@/features/encounters/mon-title";
import { MovePicker } from "@/features/encounters/move-picker";
import type { BossMon } from "@/game/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";
import { useLogFightAttempt } from "@/storage/mutations";
import { useMons } from "@/storage/queries";

const RESULTS = [
  { won: true, label: "Won" },
  { won: false, label: "Lost" },
];

function rosterLabel(boss: BossMon): string {
  return `${speciesDisplayName(boss.species)} · L${String(boss.level)}`;
}

export interface LogAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  fightId: string;
  label: string;
  roster: readonly BossMon[] | null;
}

export function LogAttemptDialog({
  open,
  onOpenChange,
  runId,
  fightId,
  label,
  roster,
}: LogAttemptDialogProps): ReactNode {
  const party = (useMons(runId).data ?? [])
    .filter((mon) => mon.status === "party")
    .sort((a, b) => (a.partySlot ?? 0) - (b.partySlot ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 flex h-full max-h-full w-full max-w-full flex-col gap-0 -translate-x-0 -translate-y-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <EncounterDialogHeader title={`Attempt: ${label}`} />
        <LogAttemptForm
          fightId={fightId}
          party={party}
          roster={roster}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface LogAttemptFormProps {
  fightId: string;
  party: readonly Mon[];
  roster: readonly BossMon[] | null;
  onDone: () => void;
}

function LogAttemptForm({ fightId, party, roster, onDone }: LogAttemptFormProps): ReactNode {
  const logAttempt = useLogFightAttempt();
  const [won, setWon] = useState(true);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [killers, setKillers] = useState<Record<string, string>>({});
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const team = roster ?? [];
  const items = team.map((boss, index) => ({ value: String(index), label: rosterLabel(boss) }));
  const missingKiller = (monId: string): boolean => ticked.has(monId) && !killers[monId];

  function toggle(monId: string): void {
    const next = new Set(ticked);
    if (next.has(monId)) next.delete(monId);
    else next.add(monId);
    setTicked(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    if (party.some((mon) => missingKiller(mon.id))) return;

    const losses = party
      .filter((mon) => ticked.has(mon.id))
      .flatMap((mon) => {
        const boss = team[Number(killers[mon.id])];
        if (boss === undefined) return [];
        return [
          {
            monId: mon.id,
            species: boss.species,
            level: boss.level,
            move: moves[mon.id] === "" ? null : (moves[mon.id] ?? null),
          },
        ];
      });
    logAttempt
      .mutateAsync({ fightId, won, losses, at: new Date().toISOString() })
      .then(onDone, () => undefined);
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div
          role="radiogroup"
          aria-label="Result"
          className="inline-flex border-[1.5px] border-border"
        >
          {RESULTS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={won === option.won}
              onClick={() => setWon(option.won)}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                index > 0 && "border-l-[1.5px] border-border",
                won === option.won
                  ? "bg-primary text-primary-foreground shadow-block"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div role="group" aria-labelledby="log-attempt-losses">
          <Typography as="span" variant="eyebrow" id="log-attempt-losses" className="mb-1 block">
            Losses
          </Typography>
          {roster === null && (
            <Typography as="p" variant="body" tone="muted" className="mb-2">
              This fight has no team data, so losses cannot be logged.
            </Typography>
          )}
          {party.length === 0 && roster !== null && (
            <Typography as="p" variant="body" tone="muted">
              No Pokémon in the party.
            </Typography>
          )}
          <ul className="m-0 list-none space-y-2 p-0">
            {party.map((mon) => {
              const checked = ticked.has(mon.id);
              const killerError = submitted && missingKiller(mon.id);
              return (
                <li key={mon.id} className="border-[1.5px] border-border p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <SquareCheckbox
                      id={`log-attempt-mon-${mon.id}`}
                      checked={checked}
                      disabled={roster === null}
                      onChange={() => toggle(mon.id)}
                    />
                    <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} />
                    <span className="font-bold">{monTitle(mon)}</span>
                  </label>
                  {checked && (
                    <div
                      role="group"
                      aria-label={`Loss details for ${monTitle(mon)}`}
                      className="mt-3 grid gap-3 sm:grid-cols-2"
                    >
                      <div>
                        <Typography
                          as="label"
                          variant="caption"
                          tone="muted"
                          htmlFor={`log-attempt-killer-${mon.id}`}
                          className="mb-1 block"
                        >
                          Killed by *
                        </Typography>
                        <Select
                          items={items}
                          value={killers[mon.id] ?? null}
                          onValueChange={(next) => setKillers({ ...killers, [mon.id]: next ?? "" })}
                        >
                          <SelectTrigger
                            id={`log-attempt-killer-${mon.id}`}
                            className="w-full"
                            aria-invalid={killerError}
                          >
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {killerError && (
                          <Typography as="p" variant="body" tone="alert" className="mt-1">
                            Choose what killed it.
                          </Typography>
                        )}
                      </div>
                      <div>
                        <Typography
                          as="label"
                          variant="caption"
                          tone="muted"
                          htmlFor={`log-attempt-move-${mon.id}`}
                          className="mb-1 block"
                        >
                          Move (optional)
                        </Typography>
                        <MovePicker
                          id={`log-attempt-move-${mon.id}`}
                          value={moves[mon.id] ?? ""}
                          onChange={(next) => setMoves({ ...moves, [mon.id]: next })}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {logAttempt.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not log the attempt: {logAttempt.error.message}. Nothing was saved.
          </Typography>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t-[1.5px] border-border p-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={logAttempt.isPending}>
          {logAttempt.isPending ? "Saving…" : "Save attempt"}
        </Button>
      </div>
    </form>
  );
}
