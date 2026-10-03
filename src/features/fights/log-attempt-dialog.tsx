import { useState, type FormEvent, type ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { SquareCheckbox } from "@/components/square-checkbox";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { validateDeath, type DeathField } from "@/domain/death-validation";
import type { Mon } from "@/domain/types";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { monTitle } from "@/features/encounters/mon-title";
import { AttackerFields } from "@/features/graveyard/attacker-fields";
import { GAMES } from "@/game/registry";
import { cn } from "@/lib/utils";
import { useLogFightAttempt } from "@/storage/mutations";
import { useMons, useRun } from "@/storage/queries";

const RESULTS = [
  { won: true, label: "Won" },
  { won: false, label: "Lost" },
];

export interface LogAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  fightId: string;
  label: string;
}

export function LogAttemptDialog({
  open,
  onOpenChange,
  runId,
  fightId,
  label,
}: LogAttemptDialogProps): ReactNode {
  const generation = GAMES[useRun(runId).data?.game ?? "heartgold"].generation;
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
        <EncounterDialogHeader title={`Attempt: ${label}`} tag={null} />
        <LogAttemptForm
          fightId={fightId}
          party={party}
          generation={generation}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface LossInput {
  speciesId: string;
  levelText: string;
  move: string;
}

const BLANK_LOSS: LossInput = { speciesId: "", levelText: "", move: "" };

function toDeathValues(input: LossInput) {
  return {
    type: "trainer" as const,
    speciesId: input.speciesId,
    level: Number(input.levelText),
    move: input.move,
    trainerName: "",
    status: "poison" as const,
    detail: "",
  };
}

interface LogAttemptFormProps {
  fightId: string;
  party: readonly Mon[];
  generation: number;
  onDone: () => void;
}

function LogAttemptForm({ fightId, party, generation, onDone }: LogAttemptFormProps): ReactNode {
  const logAttempt = useLogFightAttempt();
  const [won, setWon] = useState(true);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [killers, setKillers] = useState<Record<string, LossInput>>({});
  const [submitted, setSubmitted] = useState(false);

  const inputFor = (monId: string): LossInput => killers[monId] ?? BLANK_LOSS;
  const errorsFor = (monId: string): Partial<Record<DeathField, string>> =>
    ticked.has(monId) ? validateDeath(toDeathValues(inputFor(monId))) : {};
  const update = (monId: string, patch: Partial<LossInput>): void =>
    setKillers({ ...killers, [monId]: { ...inputFor(monId), ...patch } });

  function toggle(monId: string): void {
    const next = new Set(ticked);
    if (next.has(monId)) next.delete(monId);
    else next.add(monId);
    setTicked(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    if (party.some((mon) => Object.keys(errorsFor(mon.id)).length > 0)) return;

    const losses = party
      .filter((mon) => ticked.has(mon.id))
      .map((mon) => {
        const input = inputFor(mon.id);
        return {
          monId: mon.id,
          species: input.speciesId,
          level: Number(input.levelText),
          move: input.move === "" ? null : input.move,
        };
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
          {party.length === 0 && (
            <Typography as="p" variant="body" tone="muted">
              No Pokémon in the party.
            </Typography>
          )}
          <ul className="m-0 list-none space-y-2 p-0">
            {party.map((mon) => {
              const checked = ticked.has(mon.id);
              const input = inputFor(mon.id);
              return (
                <li key={mon.id} className="border-[1.5px] border-border p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <SquareCheckbox
                      id={`log-attempt-mon-${mon.id}`}
                      checked={checked}
                      onChange={() => toggle(mon.id)}
                    />
                    <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} />
                    <span className="font-bold">{monTitle(mon)}</span>
                  </label>
                  {checked && (
                    <div
                      role="group"
                      aria-label={`Loss details for ${monTitle(mon)}`}
                      className="mt-3"
                    >
                      <AttackerFields
                        idPrefix={`log-attempt-${mon.id}`}
                        generation={generation}
                        speciesId={input.speciesId}
                        levelText={input.levelText}
                        move={input.move}
                        errors={submitted ? errorsFor(mon.id) : {}}
                        onSpeciesChange={(speciesId) => update(mon.id, { speciesId })}
                        onLevelChange={(levelText) => update(mon.id, { levelText })}
                        onMoveChange={(move) => update(mon.id, { move })}
                      />
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
