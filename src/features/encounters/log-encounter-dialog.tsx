import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useLogEncounter } from "@/storage/mutations";
import { cn } from "@/lib/utils";

import { AbilityField, GenderField, HeldItemField, NatureField, NicknameField } from "./mon-fields";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "top-0 left-0 h-full max-h-full w-full max-w-full -translate-x-0 -translate-y-0 overflow-y-auto rounded-none",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>{route.name}</DialogTitle>
        </DialogHeader>
        <LogEncounterForm
          runId={runId}
          routeId={route.id}
          rules={rules}
          mons={mons}
          existingEncounters={existingEncounters}
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
  onDone: () => void;
}

function LogEncounterForm({
  runId,
  routeId,
  rules,
  mons,
  existingEncounters,
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
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div role="radiogroup" aria-label="Outcome" className="flex gap-2">
        {OUTCOMES.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={outcome === option.value ? "secondary" : "outline"}
            role="radio"
            aria-checked={outcome === option.value}
            onClick={() => setOutcome(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {outcome !== "caught" ? (
        <div>
          <Label htmlFor="log-encounter-species">
            {outcome === "missed" ? "Species" : "Species (optional)"}
          </Label>
          <SpeciesPicker
            id="log-encounter-species"
            value={speciesId}
            onChange={setSpeciesId}
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
            <Label htmlFor="log-encounter-species">Species</Label>
            <SpeciesPicker
              id="log-encounter-species"
              value={speciesId}
              onChange={setSpeciesId}
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
            <Label htmlFor="log-encounter-level-caught">Level caught</Label>
            <Input
              id="log-encounter-level-caught"
              inputMode="numeric"
              value={levelCaughtText}
              onChange={(event) => handleLevelCaughtChange(event.target.value)}
              aria-invalid={errors.levelCaught !== undefined}
              aria-describedby={errors.levelCaught ? "log-encounter-level-caught-error" : undefined}
            />
            {errors.levelCaught && (
              <p id="log-encounter-level-caught-error" className="mt-1 text-sm text-destructive">
                {errors.levelCaught}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="log-encounter-level">Current level</Label>
            <Input
              id="log-encounter-level"
              inputMode="numeric"
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

          <div>
            <Label htmlFor="log-encounter-placement">Placement</Label>
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
        </div>
      )}

      {logEncounter.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not log the encounter:{" "}
          {logEncounter.error instanceof Error ? logEncounter.error.message : "Unknown error"}.
          Nothing was saved.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={logEncounter.isPending}>
          {logEncounter.isPending ? "Saving…" : "Save encounter"}
        </Button>
      </div>
    </form>
  );
}
