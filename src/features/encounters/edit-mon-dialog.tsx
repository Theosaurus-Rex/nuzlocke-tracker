import { useState, type FormEvent, type ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateAmendment, type EncounterField } from "@/domain/encounter-validation";
import type { MonAmendments } from "@/domain/transitions";
import type { Gender, Mon, Route, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { useAmendMon } from "@/storage/mutations";
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

  const [nickname, setNickname] = useState(mon.nickname ?? "");
  const [gender, setGender] = useState<Gender | null>(mon.gender);
  const [levelText, setLevelText] = useState(String(mon.level));
  const [nature, setNature] = useState<string | null>(mon.nature);
  const [ability, setAbility] = useState(mon.ability ?? "");
  const [heldItem, setHeldItem] = useState(mon.heldItem ?? "");
  const [moves, setMoves] = useState<string[]>(mon.moves);
  const [submitted, setSubmitted] = useState(false);

  const amendments: MonAmendments = {
    nickname: nickname.trim() === "" ? null : nickname,
    gender,
    level: levelFromText(levelText),
    nature,
    ability: ability.trim() === "" ? null : ability,
    heldItem: heldItem.trim() === "" ? null : heldItem,
    moves,
  };

  const errors: Partial<Record<EncounterField, string>> = submitted
    ? validateAmendment({ amendments, levelCaught: mon.levelCaught, rules })
    : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (
      Object.keys(validateAmendment({ amendments, levelCaught: mon.levelCaught, rules })).length > 0
    ) {
      return;
    }

    amendMon.mutate({ mon, amendments }, { onSuccess: onDone });
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="edit-mon-species" className={FIELD_LABEL_CLASS}>
              Species
            </Label>
            <div className="relative">
              <Input
                id="edit-mon-species"
                value={speciesDisplayName(mon.speciesId)}
                readOnly
                className="pr-16"
              />
              <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
              </div>
            </div>
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
            <Label htmlFor="edit-mon-level-caught" className={FIELD_LABEL_CLASS}>
              Level caught
            </Label>
            <Input
              id="edit-mon-level-caught"
              className="font-mono"
              value={String(mon.levelCaught)}
              readOnly
            />
          </div>

          <div>
            <Label htmlFor="edit-mon-level" className={FIELD_LABEL_CLASS}>
              Current level
            </Label>
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
              <p id="edit-mon-level-error" className="mt-1 text-sm text-destructive">
                {errors.level}
              </p>
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
          <p role="alert" className="text-sm text-destructive">
            Could not save changes:{" "}
            {amendMon.error instanceof Error ? amendMon.error.message : "Unknown error"}. Nothing
            was saved.
          </p>
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
