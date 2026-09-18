/**
 * New run screen (PER-16, M1). The first way to create a run without importing a JSON backup —
 * name it, pick its game, and land on the run's own screen.
 *
 * No visual design work here: CLAUDE.md's "still open" section leaves the hand-drawn look
 * unresolved, so this is plain Tailwind on the existing tokens plus the existing `Button` — see
 * `run-list-screen.tsx` for the same approach on the most recently built real screen.
 *
 * The game picker is populated from `GAMES` (`@/game/registry`), never a hard-coded list, so
 * adding a game means adding a registry entry and nothing else — see that module's doc comment.
 * HeartGold is the only entry today, but the control is still a labelled, pre-selected `<select>`
 * rather than something that looks broken with one option.
 *
 * The name field validates on submit, not before: the message only appears once the user has
 * tried, so an empty form doesn't greet them with an error, and the submit button is never
 * disabled without explanation (CLAUDE.md's testing section calls out exactly this kind of
 * happy-path-only test; this screen's own test exercises the empty-name path deliberately). The
 * message sits next to the field and is wired to it via `aria-describedby`, rather than a
 * standalone alert banner like the mutation-failure messages elsewhere in this app (see
 * `run-list-screen.tsx`'s `DeleteConfirm`) — the two are different kinds of failure.
 *
 * `DEFAULT_RULES` (`@/domain/rules`) seeds the rules section below (PER-18): every clause,
 * randomiser toggle and the custom clause field starts at that constant's value, so an untouched
 * submit persists exactly today's pre-PER-18 behaviour. Seeding the run's route list from game
 * data is PER-22, and the boss list is PER-33 — a run created here legitimately has no routes yet.
 *
 * PER-18 only *configures* rules. Nothing here enforces them — dupes/species-clause detection and
 * nicknames-required validation are PER-41 (M4), which reads `run.rules` back. A hardcore run
 * created today behaves identically to a non-hardcore one; only the stored flag differs.
 *
 * Randomiser sub-toggle labels describe what kind of run this is ("Wild encounters are
 * randomised"), not an app behaviour they switch — see CLAUDE.md's "Pickers are never constrained
 * to one generation" decision. Every picker is already unconstrained regardless of these flags
 * (abilities/items/moves), there is no encounter table to hide (wildEncounters — PER-8 was
 * cancelled), and evolutions/trainers/starters were always metadata. The master `enabled` toggle
 * clears every sub-toggle when turned off, so the stored shape can never claim a sub-randomiser is
 * on while the run overall isn't — that combination would be read back by the PER-41 rules summary
 * as a claim about the run that isn't true.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { DEFAULT_RULES } from "@/domain/rules";
import type { GameId, Rules } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useCreateRun } from "@/storage/mutations";

const GAME_OPTIONS = Object.values(GAMES);

// The registry is guaranteed non-empty (there is always at least one supported game); this
// fallback exists only to satisfy noUncheckedIndexedAccess and is never the source of truth for
// what's selectable — GAME_OPTIONS above is.
const FIRST_GAME_ID: GameId = GAME_OPTIONS[0]?.id ?? "heartgold";

type ClauseField =
  | "dupesClause"
  | "speciesClause"
  | "shinyClause"
  | "nicknamesRequired"
  | "levelCaps"
  | "setMode"
  | "hardcore";

const CLAUSE_FIELDS: readonly { key: ClauseField; label: string }[] = [
  { key: "dupesClause", label: "Dupes clause" },
  { key: "speciesClause", label: "Species clause" },
  { key: "shinyClause", label: "Shiny clause" },
  { key: "nicknamesRequired", label: "Nicknames required" },
  { key: "levelCaps", label: "Level caps by badge" },
  { key: "setMode", label: "Set mode" },
  { key: "hardcore", label: "Hardcore" },
];

type RandomiserSubField = Exclude<keyof Rules["randomiser"], "enabled">;

// Labels describe what kind of run this is, for the record — not a picker they switch. See the
// file doc comment above.
const RANDOMISER_SUB_FIELDS: readonly { key: RandomiserSubField; label: string }[] = [
  { key: "wildEncounters", label: "Wild encounters are randomised" },
  { key: "trainers", label: "Trainer parties are randomised" },
  { key: "starters", label: "Starters are randomised" },
  { key: "abilities", label: "Abilities are randomised" },
  { key: "items", label: "Held items are randomised" },
  { key: "moves", label: "Movesets are randomised" },
  { key: "evolutions", label: "Evolutions are randomised" },
];

const CLEARED_RANDOMISER: Rules["randomiser"] = {
  enabled: false,
  wildEncounters: false,
  trainers: false,
  starters: false,
  abilities: false,
  items: false,
  moves: false,
  evolutions: false,
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
      // Turning the master off also clears every sub-toggle: a disabled sub-toggle that stayed
      // "on" underneath would be recorded as true while visibly greyed out — see file doc comment.
      randomiser: prev.randomiser.enabled
        ? CLEARED_RANDOMISER
        : { ...prev.randomiser, enabled: true },
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
          {CLAUSE_FIELDS.map(({ key, label }) => {
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
                  {label}
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
            {RANDOMISER_SUB_FIELDS.map(({ key, label }) => {
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
                    {label}
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
