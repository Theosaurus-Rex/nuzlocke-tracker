/**
 * The game picker is populated from the `GAMES` registry, not a hard-coded list. The name
 * field validates on submit, so an untouched form doesn't greet the user with an error.
 *
 * The randomiser sub-toggles and the rule clauses are real checkboxes throughout: styling them
 * as chips or square ticks never trades away their native role, name or keyboard operation. A
 * chip's visible caption is short (frame 5g/6b draw WILD, TRAINERS, ...), so each checkbox
 * carries its full sentence as `aria-label`, which wins over the wrapping label's own text for
 * the accessible name a screen reader or `getByLabelText` sees.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { CHIP_SHAPE } from "@/components/chip";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CLAUSE_FIELDS,
  DEFAULT_RULES,
  RANDOMISER_OFF,
  RANDOMISER_SUB_FIELDS,
} from "@/domain/rules";
import type { ClauseField, GameId, RandomiserSubField, Rules } from "@/domain/types";
import { FIELD_LABEL_CLASS } from "@/features/encounters/mon-fields";
import { GAMES } from "@/game/registry";
import { cn } from "@/lib/utils";
import { useCreateRun } from "@/storage/mutations";

const GAME_OPTIONS = Object.values(GAMES);

// Guards noUncheckedIndexedAccess only. GAME_OPTIONS is never empty and remains the source of
// truth for what's selectable.
const FIRST_GAME_ID: GameId = GAME_OPTIONS[0]?.id ?? "heartgold";

const CLAUSE_LABELS: Record<ClauseField, string> = {
  dupesClause: "Dupes clause",
  speciesClause: "Species clause",
  shinyClause: "Shiny clause",
  nicknamesRequired: "Nicknames required",
  levelCaps: "Level caps by badge",
  setMode: "Set mode",
  hardcore: "Hardcore",
};

const RANDOMISER_SUB_LABELS: Record<RandomiserSubField, string> = {
  wildEncounters: "Wild encounters are randomised",
  trainers: "Trainer parties are randomised",
  starters: "Starters are randomised",
  abilities: "Abilities are randomised",
  items: "Held items are randomised",
  moves: "Movesets are randomised",
  evolutions: "Evolutions are randomised",
};

// Frame 5g/6b only draw five of these as chips; `moves` and `evolutions` still need a control
// since the stored rules keep all seven, so they get a caption in the same shape.
const RANDOMISER_SUB_CHIP_LABELS: Record<RandomiserSubField, string> = {
  wildEncounters: "Wild",
  trainers: "Trainers",
  starters: "Starters",
  abilities: "Abilities",
  items: "Items",
  moves: "Moves",
  evolutions: "Evolutions",
};

/** A square, hairline-bordered checkbox with a visible tick, per the Block Shadow direction.
 * Still a native `<input type="checkbox">`, so it keeps its role, name and keyboard behaviour. */
function SquareCheckbox({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}): ReactNode {
  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center border-[1.5px] border-border bg-background",
        disabled && "opacity-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="absolute inset-0 size-full cursor-pointer appearance-none disabled:cursor-not-allowed"
      />
      {checked && (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none size-3">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      )}
    </span>
  );
}

export function NewRunScreen(): ReactNode {
  const navigate = useNavigate();
  const createRun = useCreateRun();

  const [name, setName] = useState("");
  const [game, setGame] = useState<GameId>(FIRST_GAME_ID);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [customClauseText, setCustomClauseText] = useState(DEFAULT_RULES.customClause ?? "");
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const nameIsInvalid = submitted && trimmedName.length === 0;

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.target.value);
  }

  function handleGameChange(event: ChangeEvent<HTMLSelectElement>): void {
    setGame(event.target.value as GameId);
  }

  function handleClauseToggle(key: ClauseField): void {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleRandomiserMasterToggle(): void {
    setRules((prev) => ({
      ...prev,
      // Clearing the master toggle also clears every sub-toggle, so the stored shape can never
      // claim a sub-randomiser is on while the run itself isn't a randomiser run.
      randomiser: prev.randomiser.enabled ? RANDOMISER_OFF : { ...prev.randomiser, enabled: true },
    }));
  }

  function handleRandomiserSubToggle(key: RandomiserSubField): void {
    setRules((prev) => ({
      ...prev,
      randomiser: { ...prev.randomiser, [key]: !prev.randomiser[key] },
    }));
  }

  function handleCustomClauseChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setCustomClauseText(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (trimmedName.length === 0) {
      return;
    }

    const trimmedCustomClause = customClauseText.trim();
    const finalRules: Rules = {
      ...rules,
      customClause: trimmedCustomClause.length > 0 ? trimmedCustomClause : null,
    };

    createRun.mutate(
      { name: trimmedName, game, rules: finalRules },
      {
        onSuccess: (run) => {
          void navigate(`/runs/${run.id}/routes`);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border p-4">
        <h1 className="text-xl font-bold sm:text-2xl">New run</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className={buttonVariants({ variant: "outline", className: "shadow-none" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={createRun.isPending}>
            {createRun.isPending ? "Starting…" : "Start run"}
          </Button>
        </div>
      </div>

      {createRun.isError && (
        <p role="alert" className="px-4 pt-3 text-sm text-destructive">
          Could not create the run:{" "}
          {createRun.error instanceof Error ? createRun.error.message : "Unknown error"}. Nothing
          was saved.
        </p>
      )}

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 md:divide-x-[1.5px] md:divide-border">
        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="run-name" className={FIELD_LABEL_CLASS}>
              Run name
            </label>
            <input
              id="run-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              aria-invalid={nameIsInvalid}
              aria-describedby={nameIsInvalid ? "run-name-error" : undefined}
              className="h-9 w-full border-[1.5px] border-border bg-background px-2.5 text-sm"
            />
            {nameIsInvalid && (
              <p id="run-name-error" className="mt-1 text-sm text-destructive">
                Name is required.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="run-game" className={FIELD_LABEL_CLASS}>
              Game
            </label>
            <select
              id="run-game"
              value={game}
              onChange={handleGameChange}
              className="h-9 w-full border-[1.5px] border-border bg-background px-2.5 text-sm"
            >
              {GAME_OPTIONS.map((gameData) => (
                <option key={gameData.id} value={gameData.id}>
                  {gameData.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className={FIELD_LABEL_CLASS}>Randomiser</legend>

            <div className="flex items-center gap-2">
              <SquareCheckbox
                id="rule-randomiser-enabled"
                checked={rules.randomiser.enabled}
                onChange={handleRandomiserMasterToggle}
              />
              <label htmlFor="rule-randomiser-enabled" className="text-sm font-medium">
                This is a randomiser run
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {RANDOMISER_SUB_FIELDS.map((key) => {
                const id = `rule-randomiser-${key}`;
                const checked = rules.randomiser[key];
                const disabled = !rules.randomiser.enabled;
                return (
                  <label
                    key={key}
                    htmlFor={id}
                    className={cn(
                      CHIP_SHAPE,
                      "cursor-pointer",
                      checked ? "bg-flag text-foreground" : "bg-background text-foreground",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      aria-label={RANDOMISER_SUB_LABELS[key]}
                      onChange={() => {
                        handleRandomiserSubToggle(key);
                      }}
                      className="sr-only"
                    />
                    {RANDOMISER_SUB_CHIP_LABELS[key]}
                  </label>
                );
              })}
            </div>

            <p className="text-muted-foreground text-xs">
              These record what kind of run this is, for your own reference — none of them change
              what the app shows you.
            </p>
          </fieldset>

          <div>
            <label htmlFor="rule-custom-clause" className={FIELD_LABEL_CLASS}>
              Custom clause (optional)
            </label>
            <textarea
              id="rule-custom-clause"
              value={customClauseText}
              onChange={handleCustomClauseChange}
              rows={2}
              placeholder="+ Add your own clause"
              className="w-full border-[1.5px] border-dashed border-placeholder bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <fieldset className="space-y-2 p-4">
          <legend className={FIELD_LABEL_CLASS}>Rules</legend>
          {CLAUSE_FIELDS.map((key) => {
            const id = `rule-${key}`;
            return (
              <div key={key} className="flex items-center gap-2">
                <SquareCheckbox
                  id={id}
                  checked={rules[key]}
                  onChange={() => {
                    handleClauseToggle(key);
                  }}
                />
                <label htmlFor={id} className="text-sm">
                  {CLAUSE_LABELS[key]}
                </label>
              </div>
            );
          })}
        </fieldset>
      </div>
    </form>
  );
}
