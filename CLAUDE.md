# Nuzlocke Tracker

A personal Pokémon Nuzlocke run tracker. Web app first, installable mobile app later.
Single user — there is no multi-user story and no plan for one.

**Status: M0 in progress.** Scaffolded and building — Vite/React/TS, Tailwind, shadcn/ui, and
the lint/test harness are in. The data model, storage adapter and app shell are next. See
`docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md` for the design this is built to;
it is the source of truth for table shapes and the adapter interface.

Source design: Claude Design project `52583f86-cc91-43e2-b2f3-b592e7fcec36`
("Nuzlocke Tracker Wireframes") — 10 screens, each drawn for desktop sidebar and mobile
bottom-tab shells. These are **wireframes, not a design system**; do not treat the
Patrick Hand / sketch-border styling as the intended visual direction.

Backlog, milestones and dependency order:
https://claude.ai/code/artifact/18a760bb-38e5-4834-98f6-348d08002270

---

## Commands

pnpm only. `packageManager` is pinned, so use corepack rather than a global pnpm if they differ.

| Command | Does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b` then `vite build` — typecheck is part of the build |
| `pnpm preview` | Serve the production build |
| `pnpm typecheck` | Types only, no emit |
| `pnpm lint` | ESLint, including the storage-boundary rule |
| `pnpm lint:fix` | ESLint with `--fix` |
| `pnpm format` / `pnpm format:check` | Prettier write / verify |
| `pnpm test` | Vitest once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |

**The gate before any commit is `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.**
Every commit in the history so far passes all four.

Prettier does not touch Markdown — `*.md` is in `.prettierignore`. Prose here is hand-authored,
and Prettier realigns tables and rewrites emphasis markers for no content change.

### Keep the README current

`README.md` is the setup and orientation doc. **Update it in the same commit as the change that
dates it** — a README corrected later is a README that was wrong in between, and nothing fails
when it rots.

Changes that stale it, none of which the build will catch:

- **Scripts added, renamed or removed** in `package.json` — the command table and the gate
- **Node or pnpm version moves** — the requirements table and `packageManager`
- **A new top-level directory under `src/`**, or a layer's responsibility shifting — the
  structure block and the dependency direction under it
- **A generator's invocation or env vars changing** — the regeneration commands, which are
  otherwise undiscoverable since the build never runs them
- **A known gap being closed**, e.g. the CSS breakpoint getting a real browser test — delete
  the entry rather than leaving a fixed problem listed as outstanding
- **A file moving that the README names by path**, including the design spec

Do not put counts of anything in it. A test or commit count is stale on the next commit and
nobody will notice; point at the command that prints the real number instead.

---

## Stack — decided, do not relitigate

| Layer | Use | Not |
|---|---|---|
| App | React + Vite + TypeScript | |
| Components | shadcn/ui | **not** Ionic React, **not** full Mantine |
| Tables | TanStack Table | |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` **v6 line** | **not** `@dnd-kit/react` (still 0.x), **not** react-dnd (stale), **not** Pragmatic DnD (touch reliability) |
| Storage | Dexie / IndexedDB, behind an adapter interface | |
| Mobile | Capacitor 8 + `capacitor-community/sqlite` — deferred to M6 | **not** Tauri Mobile, **not** Expo/RN |
| Backend | **None.** | |

If you think one of these needs revisiting, say so once with your reasoning and move on.
Do not quietly introduce an alternative.

### Versions as built

The table above records the decisions; these are the facts as installed. None of them reopen a
decision — check `package.json` before quoting a version from memory, as several of these moved
between the table being written and the code being built.

| Thing | Installed | Note |
|---|---|---|
| Vite / React | 8 · 19 | |
| TypeScript | **6.0.x, pinned below latest** | 7 is current, but `typescript-eslint` peers `<6.1.0`. Adopting 7 would lose type-aware linting, which is what enforces hard rule 1. Revisit when that peer range widens. |
| React Router | 8, declarative mode | *not* framework mode — no loaders, no `route.ts` |
| Tailwind | 4, via `@tailwindcss/vite` | CSS-first. There is no `tailwind.config.js` and should not be |
| shadcn/ui | CLI 4, `base-nova`, neutral | Now ships **Base UI** (`@base-ui/react`), *not* Radix |
| `cn()` | the `cn` package | Replaces hand-rolled `clsx` + `tailwind-merge`; `src/lib/utils.ts` just re-exports it |
| dnd-kit | not installed | Arrives at M3. Check `@dnd-kit/sortable` 10.x peers `core` 6.x before pinning — the two version independently, and the "v6 line" rule means `core` |

The shadcn CLI reads path aliases from `tsconfig.json` only, but the Vite template splits
tsconfigs. `@/` is therefore declared in **both** `tsconfig.json` and `tsconfig.app.json`. Keep
them in sync. Do not add `baseUrl` to either — it is deprecated in TS 6 and removed in TS 7;
`paths` resolves relative to the tsconfig's own directory.

### Why no backend

The dataset is kilobytes and single-user; the real requirement is **offline writes on a
phone mid-run**. A server turns that into conflict resolution, which is the hardest thing
in the project and invisible to the user. The Elixir-native local-first option has closed:
ElectricSQL rewrote to read-path-only sync (its docs state it does not do write-path sync)
and joined Databricks in Aug 2026 with Electric Cloud discontinued; `phoenix_sync` is small
and has no first-party Ash integration.

Theo works at an Elixir/Ash consultancy, so **do not** propose Phoenix/Ash/Postgres here on
the assumption it is the familiar tool — familiarity was never the objection. If automatic
sync is wanted in V2, evaluate InstantDB or Dexie Cloud, not a Postgres backend.

---

## Hard rules

**1. Storage goes behind an adapter interface.** Nothing outside the storage layer touches
Dexie directly. M6 swaps in native SQLite by implementing the same interface.

> Enforced, not merely agreed: `no-restricted-imports` in `eslint.config.js` bans `dexie` and
> `dexie-react-hooks` everywhere except `src/storage/**`, so a breach fails `pnpm lint`. The
> adapter interface also exposes no Dexie-only capability — no `liveQuery`, no observables —
> because native SQLite has no equivalent. Reactivity is TanStack Query's job, over the adapter.
> Components import hooks from `@/storage/queries` and never see the adapter itself.

**2. UUID-keyed flat tables per aggregate** — `runs`, `encounters`, `mons`, `deaths`,
`fights`. Never autoincrement keys. Every record carries its own `updatedAt`.

> As built this is six tables: the five above plus `routes`, which is per-run rather than global
> so that custom routes and reordering have somewhere to live and a run stays self-contained for
> export. There is deliberately no `fightAttempts` table — a fight is pending or cleared, and its
> casualties are `deaths` whose `cause.fightId` points at it.

**3. Never model a run as one nested JSON blob.** This is the obvious V1 shortcut and it
forces a full re-model before any sync tool can be adopted. Row-shaped data or nothing.

> A value object on an already-keyed row is not this. `runs.rules` and `deaths.cause` are both
> embedded objects: fixed-shape, no identity of their own, never queried independently. What the
> rule protects against is a run's *encounters, mons and deaths* living inside one document.

**4. The export format carries `schemaVersion`** from the first commit.

**5. JSON export/import is required, not a nice-to-have.** iOS Safari still evicts all
script-writable storage (IndexedDB included) after 7 days without interaction; a home-screen
PWA is less exposed but not immune, and `navigator.storage.persist()` on iOS is a heuristic
grant with no guarantee. This is a **permadeath** tracker — losing a 31-route run to storage
eviction is the one unforgivable bug. Call `persist()` on both platforms as hygiene, but
never architect as though it succeeded.

**6. Both shells are equals.** Every screen is drawn for desktop sidebar and mobile
bottom-tab. Build responsive by default; split desktop/mobile into separate work only where
the interaction genuinely differs.

---

## Testing — a green suite proves less than it looks

A passing suite shows the code does what the test author expected. When the same person wrote
both, in the same hour, from the same mental model, the tests agree with the code rather than
with reality. **Three real defects in this repo survived a fully green suite** — a party-slot
collision that corrupted data silently, and two tests that asserted nothing at all.

**Verify every new guarantee by watching the suite go red.** Break the thing deliberately, run
`pnpm test`, confirm it fails *for the right reason*, then restore:

```bash
# match on the code, never a line number — line numbers drift and the probe
# then silently applies nothing, which reads exactly like a passing test
sed -i '' 's/existing ? existing.createdAt/record.createdAt/' src/storage/memory-adapter.ts
git diff --stat            # confirm it actually applied before trusting the result
pnpm test                  # expect FAILURE. green here means the test is fake
git checkout -- src/storage/memory-adapter.ts
```

About a minute per guarantee, and it is the difference between "the tests pass" and "the tests
would notice". Every claim this repo makes — transaction rollback, timestamp semantics, the
indexed-key constraint, the sparse `cause.fightId` index, import atomicity, party-slot
allocation, Gen 4 type resolution, the shared nav config — has been checked this way.

Failure modes already seen here, each of which passed CI:

- **Tests that only describe the happy shape.** 27 transition tests all used contiguous party
  slots, so a collision that only occurs when the party has a *gap* — the state every death
  produces — was invisible.
- **A test fed the value it asserts on.** `put({ ...returnedRow, name: "x" })` then asserting
  `createdAt` survived: the draft already carried it, so the adapter's recovery path never ran.
  Deleting that path entirely left all 60 tests green.
- **Rewriting a test silently dropped coverage it was incidentally providing.** Fixing the above
  removed the only case where a draft carried its own `updatedAt`. **When you change a test,
  re-run the whole mutation battery, not just the mutation you are working on.**

**Never write a test that cannot fail.** jsdom does not evaluate CSS media queries, so a
breakpoint assertion passes whatever the classes say — there is deliberately none, and the gap
is listed openly instead. Likewise never assert a constant against its own literal: it can only
fail when someone deliberately changes it and updates the test in the same breath.

---

## Game data

No single source covers this. Two are combined:

- **PokéAPI** — species, types, abilities and evolutions. Gen 8 is incomplete and Gen 9 absent;
  Gen 2–5 is decent but has had real bugs. Spot-check anything level-cap-sensitive against a
  walkthrough. Extracted at build time into typed modules; the app never calls it at runtime,
  because offline-first is the whole reason there is no backend.
- **`domtronn/nuzlocke.data`** — `routes/*.txt` for route order, `leagues/*.txt` for gym,
  Elite Four and rival rosters. Hand-curated; nothing else has trainer rosters at all.
  PokéAPI has never had trainer data (feature requests #432 and #580 are still open).

**Licence question — resolved 2026-09-17.** Theo has cleared use of `nuzlocke.data`. The
approach is **not** to vendor the repo wholesale: bootstrap only the HeartGold subset we
actually need into our own files, in our own format, committed here, crediting the source in a
header comment. If a second game is ever wanted from upstream, bootstrap that subset the same
way. That bootstrap is one-shot, not a pipeline kept in sync with upstream — see the ownership
decision below.

**Game data is ours once seeded — decided 2026-09-18.** A generator (`scripts/extract-*.ts`) is
a one-shot bootstrapper: run it to seed a new game, or a new kind of data, not something re-run
to keep output in sync with upstream. After that, the committed files under `src/game/data/`
are ours — hand-editing them is the normal workflow, not a special case: fix an upstream error,
trim what we don't need, or tune values to suit the app, and say why in a comment beside the
change. Hand-authored romhack datasets were always the end state, so this is the same workflow
applied to data that happened to be seeded from somewhere. Reproducibility protects data you'd
actually regenerate; nobody re-runs the HeartGold extraction — only a genuinely new game would
call for that — so requiring it protected nothing and taxed the common case. A stray re-run is
now destructive rather than idempotent, so both generators refuse to overwrite a populated
output directory unless passed `--force`. See README.md "Game data" for the how.

**Level caps are derived**, not sourced — take the ace (highest-level) mon per boss. They
are a community convention, not a game mechanic, so no API will ever return them.

**Pickers are never constrained to one generation — decided 2026-09-17.** Species, ability, move
and item pickers are free-text search over **all generations**. A randomiser or a romhack can put
anything anywhere, so a picker scoped to the tracked game cannot represent what the player
actually caught, and blocking them from logging it is worse than showing too many options. The
randomiser sub-toggles already existed to defeat these constraints; a constraint that must be
defeatable was never a constraint.

Consequences, all deliberate:

- **Learnsets are not stored.** The moveset editor is free-text over every move. Filtering by a
  species' legal set is exactly the constraint being removed.
- **Wild encounter tables are not stored.** The app does not show expected encounters per route
  (PER-8 closed). The randomiser toggle labelled "hides known encounter tables" is therefore
  misleading and needs rewording when PER-18 builds the rules screen.
- **Types and move stats are resolved per generation**, not shipped as present-day values. A
  `GameData` carries its `generation`, and the picker resolves through PokéAPI's `past_types` /
  `past_values`. Clefairy is Normal in a HeartGold run and Fairy in a Gen 6+ one; Vine Whip is 35
  power there and 45 now. Present-day values would be visibly wrong for the game being tracked.

**Scope: HeartGold only for V1.** Every additional game is a whole curated dataset, not a
config flag. Build the ingest pipeline so a second game is additive.

**Romhacks are a first-class future case, not an afterthought.** Theo intends to hand-author
datasets for romhacks he wants to support. So the game-data format is something a human writes
by hand, not just something a script emits: it needs to be readable, typed, and validated at
build time, and adding a game must mean adding one directory plus one registry entry. Nothing
in the app may assume a game's data came from `nuzlocke.data`.

---

## Still open — do not assume

- **Visual direction.** shadcn defers this rather than answering it. Do not invest in a
  polish pass until Theo decides whether the hand-drawn look is real.
- **Desktop/mobile issue split.** Currently one responsive issue per screen.
- ~~The randomiser toggle ("hides known encounter tables")~~ **Resolved 2026-09-17:** the app does
  not show expected encounters per route. PER-8 is closed and no encounter tables are stored.
  Reword that toggle's label when PER-18 builds the rules screen.
- Run stats screen and distraction-free logging mode are noted in the design but never
  drawn. They need design before they are buildable.

---

## Linear

This is a **personal** project. Issues live in the **Personal** workspace
(`linear.app/theo-harris-dev`), team `PER`, project **Nuzlocke Tracker v1**:
https://linear.app/theo-harris-dev/project/nuzlocke-tracker-v1-6f0791fd9d32

Served by the `linear-personal` MCP server, scoped to this directory only.

Issues are `PER-5` … `PER-41`, titled `NN · Title` where `NN` is the build-order number used
in the backlog page. Milestones M0–M6 run in dependency order; `blockedBy` relations are set.

**Theo's employer Linear (Alembic) may also be connected in other contexts. Never create
issues for this project there.** Confirm the workspace is `Personal` before filing anything.
