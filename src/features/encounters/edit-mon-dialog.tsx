import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { validateAmendment, type EncounterField } from "@/domain/encounter-validation";
import type { MonAmendments } from "@/domain/transitions";
import type { Gender, Mon, Route, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { useAmendMon } from "@/storage/mutations";
import { useRun } from "@/storage/queries";
import { cn, joinIds } from "@/lib/utils";

import { EncounterDialogHeader } from "./encounter-dialog-header";
import { EvolveControl } from "./evolve-control";
import {
  AbilityField,
  GenderField,
  HeldItemField,
  NatureField,
  NicknameField,
  ShinyField,
} from "./mon-fields";
import { MovesetField } from "./moveset-field";
import { SpeciesPicker } from "./species-picker";

function levelFromText(text: string): number {
  return Number(text);
}

export interface EditMonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  mon: Mon;
  rules: Rules;
}

export function EditMonDialog({
  open,
  onOpenChange,
  route,
  mon,
  rules,
}: EditMonDialogProps): ReactNode {
  const runQuery = useRun(route.runId);
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
        <EditMonForm
          mon={mon}
          rules={rules}
          generation={generation}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditMonFormProps {
  mon: Mon;
  rules: Rules;
  generation: number;
  onDone: () => void;
}

function EditMonForm({ mon, rules, generation, onDone }: EditMonFormProps): ReactNode {
  const amendMon = useAmendMon();

  const [pendingSpecies, setPendingSpecies] = useState(mon.speciesId);
  const [pickerValue, setPickerValue] = useState(mon.speciesId);
  const [pickingAny, setPickingAny] = useState(false);
  const randomisedEvolutions = rules.randomiser.enabled && rules.randomiser.evolutions;
  const evolved = pendingSpecies !== mon.speciesId;
  const showUndo = pickingAny || evolved;

  const speciesInputRef = useRef<HTMLInputElement>(null);
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    if (undoCount > 0) speciesInputRef.current?.focus();
  }, [undoCount]);

  function handleSpeciesPick(id: string): void {
    setPickerValue(id);
    if (id !== "") setPendingSpecies(id);
  }

  function undoEvolve(): void {
    setPendingSpecies(mon.speciesId);
    setPickerValue(mon.speciesId);
    setPickingAny(false);
    setUndoCount((count) => count + 1);
  }

  const [nickname, setNickname] = useState(mon.nickname ?? "");
  const [gender, setGender] = useState<Gender | null>(mon.gender);
  const [levelText, setLevelText] = useState(String(mon.level));
  const [nature, setNature] = useState<string | null>(mon.nature);
  const [ability, setAbility] = useState(mon.ability ?? "");
  const [heldItem, setHeldItem] = useState(mon.heldItem ?? "");
  const [moves, setMoves] = useState<string[]>(mon.moves);
  const [shiny, setShiny] = useState(mon.shiny);
  const [submitted, setSubmitted] = useState(false);

  const speciesUnresolved = pickingAny && pickerValue === "";
  const speciesError =
    submitted && speciesUnresolved ? "Pick a species from the list, or undo." : undefined;
  const speciesDescribedBy = joinIds(
    speciesError ? "edit-mon-species-error" : undefined,
    showUndo ? "edit-mon-evolved-note" : undefined,
  );

  const amendments: MonAmendments = {
    nickname: nickname.trim() === "" ? null : nickname,
    gender,
    level: levelFromText(levelText),
    nature,
    ability: ability.trim() === "" ? null : ability,
    heldItem: heldItem.trim() === "" ? null : heldItem,
    moves,
    shiny,
  };

  const errors: Partial<Record<EncounterField, string>> = submitted
    ? validateAmendment({ amendments, levelCaught: mon.levelCaught, rules })
    : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (speciesUnresolved) {
      return;
    }

    if (
      Object.keys(validateAmendment({ amendments, levelCaught: mon.levelCaught, rules })).length > 0
    ) {
      return;
    }

    amendMon.mutate(
      { mon, amendments, evolvedTo: evolved ? pendingSpecies : undefined },
      { onSuccess: onDone },
    );
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex justify-end">
          <ShinyField id="edit-mon-shiny" value={shiny} onChange={setShiny} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="edit-mon-species"
              className="mb-1 block"
            >
              Species
            </Typography>
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                {pickingAny ? (
                  <SpeciesPicker
                    id="edit-mon-species"
                    value={pickerValue}
                    onChange={handleSpeciesPick}
                    generation={generation}
                    aria-invalid={speciesError !== undefined}
                    aria-describedby={speciesDescribedBy}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      id="edit-mon-species"
                      ref={speciesInputRef}
                      value={speciesDisplayName(pendingSpecies)}
                      readOnly
                      className="pr-16"
                      aria-describedby={speciesDescribedBy}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                      <SpeciesTypeBadge speciesId={pendingSpecies} generation={generation} />
                    </div>
                  </div>
                )}
              </div>
              {!pickingAny && (
                <EvolveControl
                  id="edit-mon-evolve"
                  speciesId={pendingSpecies}
                  randomised={randomisedEvolutions}
                  onEvolve={setPendingSpecies}
                  onPickAny={() => setPickingAny(true)}
                />
              )}
            </div>
            {speciesError && (
              <Typography
                as="p"
                id="edit-mon-species-error"
                variant="body"
                tone="alert"
                className="mt-1"
              >
                {speciesError}
              </Typography>
            )}
            {showUndo && (
              <Typography
                as="p"
                id="edit-mon-evolved-note"
                variant="caption"
                tone="muted"
                className="mt-1"
              >
                {evolved && `Evolved from ${speciesDisplayName(mon.speciesId)} · `}
                <button type="button" className="underline" onClick={undoEvolve}>
                  Undo
                </button>
              </Typography>
            )}
          </div>

          <NicknameField
            id="edit-mon-nickname"
            value={nickname}
            onChange={setNickname}
            required={rules.nicknamesRequired}
            error={errors.nickname}
          />

          <GenderField value={gender} onChange={setGender} />

          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="edit-mon-level-caught"
              className="mb-1 block"
            >
              Level caught
            </Typography>
            <Input
              id="edit-mon-level-caught"
              className="font-mono"
              value={String(mon.levelCaught)}
              readOnly
            />
          </div>

          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="edit-mon-level"
              className="mb-1 block"
            >
              Current level
            </Typography>
            <Input
              id="edit-mon-level"
              inputMode="numeric"
              className="font-mono"
              value={levelText}
              onChange={(event) => setLevelText(event.target.value)}
              aria-invalid={errors.level !== undefined}
              aria-describedby={errors.level ? "edit-mon-level-error" : undefined}
            />
            {errors.level && (
              <Typography
                as="p"
                id="edit-mon-level-error"
                variant="body"
                tone="alert"
                className="mt-1"
              >
                {errors.level}
              </Typography>
            )}
          </div>

          <NatureField id="edit-mon-nature" value={nature} onChange={setNature} />

          <AbilityField id="edit-mon-ability" value={ability} onChange={setAbility} />

          <HeldItemField id="edit-mon-held-item" value={heldItem} onChange={setHeldItem} />

          <div className="sm:col-span-2">
            <MovesetField id="edit-mon-move" value={moves} onChange={setMoves} />
          </div>
        </div>

        {amendMon.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not save changes:{" "}
            {amendMon.error instanceof Error ? amendMon.error.message : "Unknown error"}. Nothing
            was saved.
          </Typography>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t-[1.5px] border-border p-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={amendMon.isPending}>
          {amendMon.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
