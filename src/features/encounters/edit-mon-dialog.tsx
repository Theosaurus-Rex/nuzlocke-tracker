import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateAmendment, type EncounterField } from "@/domain/encounter-validation";
import type { MonAmendments } from "@/domain/transitions";
import type { Gender, Mon, Route, Rules } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokedex";
import { useAmendMon } from "@/storage/mutations";
import { cn } from "@/lib/utils";

import { AbilityField, GenderField, HeldItemField, NatureField, NicknameField } from "./mon-fields";

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
        <EditMonForm mon={mon} rules={rules} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface EditMonFormProps {
  mon: Mon;
  rules: Rules;
  onDone: () => void;
}

function EditMonForm({ mon, rules, onDone }: EditMonFormProps): ReactNode {
  const amendMon = useAmendMon();

  const [nickname, setNickname] = useState(mon.nickname ?? "");
  const [gender, setGender] = useState<Gender | null>(mon.gender);
  const [levelText, setLevelText] = useState(String(mon.level));
  const [nature, setNature] = useState<string | null>(mon.nature);
  const [ability, setAbility] = useState(mon.ability ?? "");
  const [heldItem, setHeldItem] = useState(mon.heldItem ?? "");
  const [submitted, setSubmitted] = useState(false);

  const amendments: MonAmendments = {
    nickname: nickname.trim() === "" ? null : nickname,
    gender,
    level: levelFromText(levelText),
    nature,
    ability: ability.trim() === "" ? null : ability,
    heldItem: heldItem.trim() === "" ? null : heldItem,
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
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="edit-mon-species">Species</Label>
          <Input id="edit-mon-species" value={speciesDisplayName(mon.speciesId)} readOnly />
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
          <Label htmlFor="edit-mon-level-caught">Level caught</Label>
          <Input id="edit-mon-level-caught" value={String(mon.levelCaught)} readOnly />
        </div>

        <div>
          <Label htmlFor="edit-mon-level">Current level</Label>
          <Input
            id="edit-mon-level"
            inputMode="numeric"
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
      </div>

      {amendMon.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not save changes:{" "}
          {amendMon.error instanceof Error ? amendMon.error.message : "Unknown error"}. Nothing was
          saved.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={amendMon.isPending}>
          {amendMon.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
