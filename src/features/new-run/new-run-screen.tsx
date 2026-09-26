/**
 * The randomiser sub-toggles and rule clauses render as chips, but stay real checkboxes so they
 * keep their native role and keyboard behaviour. Each chip's caption is short, so `aria-label`
 * carries the full accessible name instead of the visible text.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { CHIP_SHAPE } from "@/components/chip";
import { ScreenHeader } from "@/components/screen-header";
import { SquareCheckbox } from "@/components/square-checkbox";
import { Typography } from "@/components/typography";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CLAUSE_FIELDS,
  DEFAULT_RULES,
  RANDOMISER_OFF,
  RANDOMISER_SUB_FIELDS,
} from "@/domain/rules";
import type { ClauseField, GameId, RandomiserSubField, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { cn } from "@/lib/utils";
import { useCreateRun } from "@/storage/mutations";
import { useRuns } from "@/storage/queries";

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

// The wireframe only draws five of these as chips. `moves` and `evolutions` still need a
// caption in the same shape, since the stored rules keep all seven.
const RANDOMISER_SUB_CHIP_LABELS: Record<RandomiserSubField, string> = {
  wildEncounters: "Wild",
  trainers: "Trainers",
  starters: "Starters",
  abilities: "Abilities",
  items: "Items",
  moves: "Moves",
  evolutions: "Evolutions",
};

export function NewRunScreen(): ReactNode {
  const navigate = useNavigate();
  const createRun = useCreateRun();
  const runsQuery = useRuns();
  const hasRuns = (runsQuery.data?.length ?? 0) > 0;

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
      <ScreenHeader
        title="New run"
        actions={
          <div className="flex items-center gap-2">
            {hasRuns && (
              <Link
                to="/"
                className={buttonVariants({ variant: "outline", className: "shadow-none" })}
              >
                Cancel
              </Link>
            )}
            <Button type="submit" disabled={createRun.isPending}>
              {createRun.isPending ? "Starting…" : "Start run"}
            </Button>
          </div>
        }
      />

      {createRun.isError && (
        <Typography role="alert" variant="body" tone="alert" className="px-4 pt-3">
          Could not create the run:{" "}
          {createRun.error instanceof Error ? createRun.error.message : "Unknown error"}. Nothing
          was saved.
        </Typography>
      )}

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 md:divide-x-[1.5px] md:divide-border">
        <div className="space-y-4 p-4">
          <div>
            <Typography as="label" htmlFor="run-name" variant="eyebrow" className="mb-1 block">
              Run name
            </Typography>
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
              <Typography id="run-name-error" variant="body" tone="alert" className="mt-1">
                Name is required.
              </Typography>
            )}
          </div>

          <div>
            <Typography as="label" htmlFor="run-game" variant="eyebrow" className="mb-1 block">
              Game
            </Typography>
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
            <Typography as="legend" variant="eyebrow" className="mb-1 block">
              Randomiser
            </Typography>

            <div className="flex items-center gap-2">
              <SquareCheckbox
                id="rule-randomiser-enabled"
                checked={rules.randomiser.enabled}
                onChange={handleRandomiserMasterToggle}
              />
              <Typography as="label" htmlFor="rule-randomiser-enabled" variant="strong">
                This is a randomiser run
              </Typography>
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

            <Typography variant="caption" tone="muted">
              These record what kind of run this is, for your own reference — none of them change
              what the app shows you.
            </Typography>
          </fieldset>

          <div>
            <Typography
              as="label"
              htmlFor="rule-custom-clause"
              variant="eyebrow"
              className="mb-1 block"
            >
              Custom clause (optional)
            </Typography>
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
          <Typography as="legend" variant="eyebrow" className="mb-1 block">
            Rules
          </Typography>
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
                <Typography as="label" htmlFor={id} variant="body">
                  {CLAUSE_LABELS[key]}
                </Typography>
              </div>
            );
          })}
        </fieldset>
      </div>
    </form>
  );
}
