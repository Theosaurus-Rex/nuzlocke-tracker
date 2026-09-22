import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countByMonStatus } from "@/domain/derive";
import { validateEncounter, type EncounterField } from "@/domain/encounter-validation";
import type { CatchDetails } from "@/domain/transitions";
import type { Encounter, Gender, Mon, Route, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useLogEncounter } from "@/storage/mutations";
import { useRun } from "@/storage/queries";
import { cn } from "@/lib/utils";

import { EncounterDialogHeader } from "./encounter-dialog-header";
import {
  AbilityField,
  FIELD_LABEL_CLASS,
  GenderField,
  HeldItemField,
  NatureField,
  NicknameField,
} from "./mon-fields";
import { MovesetField } from "./moveset-field";
import { SpeciesPicker } from "./species-picker";

type Outcome = "caught" | "missed" | "skipped";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "caught", label: "Caught" },
  { value: "missed", label: "Missed" },
  { value: "skipped", label: "Skipped" },
];

function levelFromText(text: string): number {
  return Number(text);
}

export interface LogEncounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  route: Route;
  rules: Rules;
  mons: readonly Mon[];
  existingEncounters: readonly Encounter[];
}

export function LogEncounterDialog({
  open,
  onOpenChange,
  runId,
  route,
  rules,
  mons,
  existingEncounters,
}: LogEncounterDialogProps): ReactNode {
  const runQuery = useRun(runId);
  // Falls back to HeartGold's generation, the only game seeded today, while the run is loading.
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 flex h-full max-h-full w-full max-w-full flex-col gap-0 -translate-x-0 -translate-y-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <EncounterDialogHeader title={route.name} />
        <LogEncounterForm
          runId={runId}
          routeId={route.id}
          rules={rules}
          mons={mons}
          existingEncounters={existingEncounters}
          generation={generation}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface LogEncounterFormProps {
  runId: string;
  routeId: string;
  rules: Rules;
  mons: readonly Mon[];
  existingEncounters: readonly Encounter[];
  generation: number;
  onDone: () => void;
}

function LogEncounterForm({
  runId,
  routeId,
  rules,
  mons,
  existingEncounters,
  generation,
  onDone,
}: LogEncounterFormProps): ReactNode {
  const logEncounter = useLogEncounter();

  const [outcome, setOutcome] = useState<Outcome>("caught");
  const [speciesId, setSpeciesId] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [levelCaughtText, setLevelCaughtText] = useState("");
  const [levelText, setLevelText] = useState("");
  const [levelTouched, setLevelTouched] = useState(false);
  const [nature, setNature] = useState<string | null>(null);
  const [ability, setAbility] = useState("");
  const [heldItem, setHeldItem] = useState("");
  const [moves, setMoves] = useState<string[]>([]);
  const [placement, setPlacement] = useState<"party" | "box">(
    countByMonStatus(mons).party < 6 ? "party" : "box",
  );
  const [submitted, setSubmitted] = useState(false);

  const details: CatchDetails = {
    speciesId,
    levelCaught: levelFromText(levelCaughtText),
    level: levelFromText(levelText),
    placement,
    nickname: nickname.trim() === "" ? null : nickname,
    gender,
    nature,
    ability: ability.trim() === "" ? null : ability,
    heldItem: heldItem.trim() === "" ? null : heldItem,
    moves,
  };

  const errors: Partial<Record<EncounterField, string>> = submitted
    ? validateEncounter({ outcome, details, rules })
    : {};

  function handleLevelCaughtChange(text: string): void {
    setLevelCaughtText(text);
    if (!levelTouched) {
      setLevelText(text);
    }
  }

  function handleLevelChange(text: string): void {
    setLevelTouched(true);
    setLevelText(text);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (Object.keys(validateEncounter({ outcome, details, rules })).length > 0) {
      return;
    }

    logEncounter.mutate(
      {
        runId,
        routeId,
        outcome,
        party: mons,
        details: outcome === "caught" ? details : undefined,
        speciesId: outcome === "caught" ? undefined : speciesId.trim() === "" ? null : speciesId,
        existingEncounters,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div
          role="radiogroup"
          aria-label="Outcome"
          className="inline-flex border-[1.5px] border-border"
        >
          {OUTCOMES.map((option, index) => {
            const active = outcome === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setOutcome(option.value)}
                className={cn(
                  "px-4 py-2 text-sm font-medium",
                  index > 0 && "border-l-[1.5px] border-border",
                  active
                    ? "bg-primary text-primary-foreground shadow-block"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {outcome !== "caught" ? (
          <div>
            <Label htmlFor="log-encounter-species" className={FIELD_LABEL_CLASS}>
              {outcome === "missed" ? "Species" : "Species (optional)"}
            </Label>
            <SpeciesPicker
              id="log-encounter-species"
              value={speciesId}
              onChange={setSpeciesId}
              generation={generation}
              aria-invalid={errors.speciesId !== undefined}
              aria-describedby={errors.speciesId ? "log-encounter-species-error" : undefined}
            />
            {errors.speciesId && (
              <p id="log-encounter-species-error" className="mt-1 text-sm text-destructive">
                {errors.speciesId}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="log-encounter-species" className={FIELD_LABEL_CLASS}>
                Species
              </Label>
              <SpeciesPicker
                id="log-encounter-species"
                value={speciesId}
                onChange={setSpeciesId}
                generation={generation}
                aria-invalid={errors.speciesId !== undefined}
                aria-describedby={errors.speciesId ? "log-encounter-species-error" : undefined}
              />
              {errors.speciesId && (
                <p id="log-encounter-species-error" className="mt-1 text-sm text-destructive">
                  {errors.speciesId}
                </p>
              )}
            </div>

            <NicknameField
              id="log-encounter-nickname"
              value={nickname}
              onChange={setNickname}
              required={rules.nicknamesRequired}
              error={errors.nickname}
            />

            <GenderField value={gender} onChange={setGender} />

            <div>
              <Label htmlFor="log-encounter-level-caught" className={FIELD_LABEL_CLASS}>
                Level caught
              </Label>
              <Input
                id="log-encounter-level-caught"
                inputMode="numeric"
                className="font-mono"
                value={levelCaughtText}
                onChange={(event) => handleLevelCaughtChange(event.target.value)}
                aria-invalid={errors.levelCaught !== undefined}
                aria-describedby={
                  errors.levelCaught ? "log-encounter-level-caught-error" : undefined
                }
              />
              {errors.levelCaught && (
                <p id="log-encounter-level-caught-error" className="mt-1 text-sm text-destructive">
                  {errors.levelCaught}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="log-encounter-level" className={FIELD_LABEL_CLASS}>
                Current level
              </Label>
              <Input
                id="log-encounter-level"
                inputMode="numeric"
                className="font-mono"
                value={levelText}
                onChange={(event) => handleLevelChange(event.target.value)}
                aria-invalid={errors.level !== undefined}
                aria-describedby={errors.level ? "log-encounter-level-error" : undefined}
              />
              {errors.level && (
                <p id="log-encounter-level-error" className="mt-1 text-sm text-destructive">
                  {errors.level}
                </p>
              )}
            </div>

            <NatureField id="log-encounter-nature" value={nature} onChange={setNature} />

            <AbilityField id="log-encounter-ability" value={ability} onChange={setAbility} />

            <HeldItemField id="log-encounter-held-item" value={heldItem} onChange={setHeldItem} />

            <div className="sm:col-span-2">
              <MovesetField id="log-encounter-move" value={moves} onChange={setMoves} />
            </div>
          </div>
        )}

        {logEncounter.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not log the encounter:{" "}
            {logEncounter.error instanceof Error ? logEncounter.error.message : "Unknown error"}.
            Nothing was saved.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-border p-4">
        {outcome === "caught" ? (
          <div>
            <Label htmlFor="log-encounter-placement" className={FIELD_LABEL_CLASS}>
              Placement
            </Label>
            <Select value={placement} onValueChange={(value) => setPlacement(value!)}>
              <SelectTrigger id="log-encounter-placement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="party">Party</SelectItem>
                <SelectItem value="box">Box</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={logEncounter.isPending}>
            {logEncounter.isPending ? "Saving…" : "Save encounter"}
          </Button>
        </div>
      </div>
    </form>
  );
}
