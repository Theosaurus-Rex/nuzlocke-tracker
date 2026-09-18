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
 * Only `DEFAULT_RULES` (`@/domain/rules`) is used here; the rules screen that makes them editable
 * is PER-18. Seeding the run's route list from game data is PER-22, and the boss list is PER-33 —
 * a run created here legitimately has no routes yet.
 */

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import type { GameId } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useCreateRun } from "@/storage/mutations";

const GAME_OPTIONS = Object.values(GAMES);

// The registry is guaranteed non-empty (there is always at least one supported game); this
// fallback exists only to satisfy noUncheckedIndexedAccess and is never the source of truth for
// what's selectable — GAME_OPTIONS above is.
const FIRST_GAME_ID: GameId = GAME_OPTIONS[0]?.id ?? "heartgold";

export function NewRunScreen(): ReactNode {
  const navigate = useNavigate();
  const createRun = useCreateRun();

  const [name, setName] = useState("");
  const [game, setGame] = useState<GameId>(FIRST_GAME_ID);
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const nameIsInvalid = submitted && trimmedName.length === 0;

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.target.value);
  }

  function handleGameChange(event: ChangeEvent<HTMLSelectElement>): void {
    setGame(event.target.value as GameId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (trimmedName.length === 0) {
      return;
    }

    createRun.mutate(
      { name: trimmedName, game },
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

        {createRun.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not create the run:{" "}
            {createRun.error instanceof Error ? createRun.error.message : "Unknown error"}.
            Nothing was saved.
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
