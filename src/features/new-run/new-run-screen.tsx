/**
 * The game picker is populated from the `GAMES` registry, not a hard-coded list. The name
 * field validates on submit, so an untouched form doesn't greet the user with an error.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  CLAUSE_FIELDS,
  DEFAULT_RULES,
  RANDOMISER_OFF,
  RANDOMISER_SUB_FIELDS,
} from "@/domain/rules";
import type { ClauseField, GameId, RandomiserSubField, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
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
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-xl">New run</h1>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="run-name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="run-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            aria-invalid={nameIsInvalid}
            aria-describedby={nameIsInvalid ? "run-name-error" : undefined}
            className="mt-1 h-8 w-full rounded border border-border bg-background px-2.5 text-sm"
          />
          {nameIsInvalid && (
            <p id="run-name-error" className="mt-1 text-sm text-destructive">
              Name is required.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="run-game" className="block text-sm font-medium">
            Game
          </label>
          <select
            id="run-game"
            value={game}
            onChange={handleGameChange}
            className="mt-1 h-8 w-full rounded border border-border bg-background px-2.5 text-sm"
          >
            {GAME_OPTIONS.map((gameData) => (
              <option key={gameData.id} value={gameData.id}>
                {gameData.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2 rounded border border-border p-3">
          <legend className="px-1 text-sm font-medium">Clauses</legend>
          {CLAUSE_FIELDS.map((key) => {
            const id = `rule-${key}`;
            return (
              <div key={key} className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  checked={rules[key]}
                  onChange={() => {
                    handleClauseToggle(key);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor={id} className="text-sm">
                  {CLAUSE_LABELS[key]}
                </label>
              </div>
            );
          })}
        </fieldset>

        <fieldset className="space-y-2 rounded border border-border p-3">
          <legend className="px-1 text-sm font-medium">Randomiser</legend>

          <div className="flex items-center gap-2">
            <input
              id="rule-randomiser-enabled"
              type="checkbox"
              checked={rules.randomiser.enabled}
              onChange={handleRandomiserMasterToggle}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="rule-randomiser-enabled" className="text-sm font-medium">
              This is a randomiser run
            </label>
          </div>

          <p className="text-muted-foreground text-xs">
            These record what kind of run this is, for your own reference — none of them change what
            the app shows you.
          </p>

          <div className="ml-6 space-y-2">
            {RANDOMISER_SUB_FIELDS.map((key) => {
              const id = `rule-randomiser-${key}`;
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    id={id}
                    type="checkbox"
                    checked={rules.randomiser[key]}
                    disabled={!rules.randomiser.enabled}
                    onChange={() => {
                      handleRandomiserSubToggle(key);
                    }}
                    className="h-4 w-4 rounded border-border disabled:opacity-50"
                  />
                  <label
                    htmlFor={id}
                    className={
                      rules.randomiser.enabled ? "text-sm" : "text-sm text-muted-foreground"
                    }
                  >
                    {RANDOMISER_SUB_LABELS[key]}
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="rule-custom-clause" className="block text-sm font-medium">
            Custom clause (optional)
          </label>
          <textarea
            id="rule-custom-clause"
            value={customClauseText}
            onChange={handleCustomClauseChange}
            rows={2}
            className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm"
          />
        </div>

        {createRun.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not create the run:{" "}
            {createRun.error instanceof Error ? createRun.error.message : "Unknown error"}. Nothing
            was saved.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={createRun.isPending}>
            {createRun.isPending ? "Creating…" : "Create run"}
          </Button>
          <Link to="/" className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
