import { useState, type FormEvent, type ReactNode } from "react";

import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LevelInput } from "@/components/level-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { useAddCustomFight } from "@/storage/mutations";

export interface FightOption {
  id: string;
  label: string;
}

export interface AddFightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  pending: readonly FightOption[];
}

function parseCap(text: string): { cap: number | null; error: string | null } {
  const trimmed = text.trim();
  if (trimmed === "") return { cap: null, error: null };
  const cap = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || cap < 1 || cap > 100) {
    return { cap: null, error: "Level cap must be a whole number from 1 to 100." };
  }
  return { cap, error: null };
}

export function AddFightDialog({
  open,
  onOpenChange,
  runId,
  pending,
}: AddFightDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 p-0">
        <EncounterDialogHeader title="Add fight" tag={null} />
        <AddFightForm runId={runId} pending={pending} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface AddFightFormProps {
  runId: string;
  pending: readonly FightOption[];
  onDone: () => void;
}

function AddFightForm({ runId, pending, onDone }: AddFightFormProps): ReactNode {
  const addFight = useAddCustomFight();
  const [name, setName] = useState("");
  const [capText, setCapText] = useState("");
  const [beforeId, setBeforeId] = useState<string | null>(pending[0]?.id ?? null);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && name.trim() === "" ? "Fight name is required." : null;
  const capError = submitted ? parseCap(capText).error : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    const { cap, error } = parseCap(capText);
    if (name.trim() === "" || error !== null) return;

    addFight
      .mutateAsync({ runId, name, levelCap: cap, beforeFightId: beforeId })
      .then(onDone, () => undefined);
  }

  return (
    <form className="flex flex-col" onSubmit={handleSubmit} noValidate>
      <div className="space-y-4 p-4">
        <div>
          <Typography as="label" variant="eyebrow" htmlFor="add-fight-name" className="mb-1 block">
            Name
          </Typography>
          <Input
            id="add-fight-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={nameError !== null}
            aria-describedby={nameError === null ? undefined : "add-fight-name-error"}
          />
          {nameError !== null && (
            <Typography
              as="p"
              id="add-fight-name-error"
              variant="body"
              tone="alert"
              className="mt-1"
            >
              {nameError}
            </Typography>
          )}
        </div>

        {pending.length > 0 && (
          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="add-fight-before"
              className="mb-1 block"
            >
              Comes before
            </Typography>
            <Select
              items={pending.map((option) => ({ value: option.id, label: option.label }))}
              value={beforeId}
              onValueChange={setBeforeId}
            >
              <SelectTrigger id="add-fight-before" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pending.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Typography as="label" variant="eyebrow" htmlFor="add-fight-cap" className="mb-1 block">
            Level cap (optional)
          </Typography>
          <LevelInput
            id="add-fight-cap"
            className="font-mono"
            value={capText}
            onValueChange={setCapText}
            aria-invalid={capError !== null}
            aria-describedby={capError === null ? undefined : "add-fight-cap-error"}
          />
          {capError !== null && (
            <Typography
              as="p"
              id="add-fight-cap-error"
              variant="body"
              tone="alert"
              className="mt-1"
            >
              {capError}
            </Typography>
          )}
        </div>

        {addFight.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not add the fight: {addFight.error.message}. Nothing was saved.
          </Typography>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t-[1.5px] border-border p-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={addFight.isPending}>
          {addFight.isPending ? "Saving…" : "Add fight"}
        </Button>
      </div>
    </form>
  );
}
