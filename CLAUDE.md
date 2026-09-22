# Nuzlocke Tracker

A personal Pokémon Nuzlocke run tracker. Web app first, installable mobile app later.
Single user — there is no multi-user story and no plan for one.

**Status: M0 in progress.** Scaffolded and building — Vite/React/TS, Tailwind, shadcn/ui, and
the lint/test harness are in. The data model, storage adapter and app shell are next. See
`docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md` for the design this is built to;
it is the source of truth for table shapes and the adapter interface.

**Wireframes live in `docs/wireframes/`**, one PNG per frame. Every Linear issue names the
frames it is drawn from (`**Wireframe:** 5h, 6d (hi-fi) · 2g, 1d-4 (lo-fi)`); open them and look
at them before building a screen. `all` means the whole set, `—` means nothing was drawn.
`docs/wireframes/README.md` indexes every frame by screen name.

**Build to the hi-fi frames.** They are `docs/wireframes/hifi/frames/*.png`, cut from an HTML
canvas export in the same directory, and they are the finished design. The lo-fi set under
`docs/wireframes/frames/` stays for history, because the issues still cite it and it carries flow
detail the hi-fi frames do not repeat. Where the two disagree, hi-fi wins.

Do not read the lo-fi PDF directly: it is one page over 6000pt tall, so it scales down to an
unreadable sliver. Both canvases are also attached to the Linear project, behind signed URLs that
expire minutes after they are issued; the copies in the repo are the ones to use.

**The visual direction is Block Shadow**, decided 2026-09-22 from four drawn alternatives.
Hairline black borders, hard offset shadows, three loud accents. `docs/design/block-shadow.md`
has the palette, the type rules and the component shapes, measured out of the canvas markup
rather than eyeballed from a PNG. The lo-fi set's Patrick Hand / sketch-border styling was never
the intended look.

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

**The gate before any commit is `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`.**
Every commit in the history so far passes all five.

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
| TanStack Table | **9.x** | The v8 API every tutorial shows is gone. There is no `useReactTable` and no `getCoreRowModel`: v9 is `useTable` + `tableFeatures({})` + `createColumnHelper`. `@tanstack/react-table/legacy` still exports the v8 shape, deprecated. Do not use the shim |

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
F=src/storage/memory-adapter.ts
cp "$F" /tmp/probe.bak          # NOT `git checkout --` to restore: see below

# match on the code, never a line number — line numbers drift and the probe
# then silently applies nothing, which reads exactly like a passing test
sed -i '' 's/existing ? existing.createdAt/record.createdAt/' "$F"
git diff --stat                 # confirm it actually applied before trusting the result
# `git diff` shows nothing for a file git is not yet tracking, which looks exactly like a probe
# that applied nothing. For a new file, confirm with `grep` for the changed line instead.
pnpm test                       # expect FAILURE. green here means the test is fake

cp /tmp/probe.bak "$F"          # safe whether or not the file was committed
```

**Restore from a copy, never with `git checkout -- <file>`.** That reverts the file to `HEAD`, so
if the code you are probing is not committed yet — which it usually is not, since you are
probing work in progress — it deletes the feature along with the probe. This has already cost one
session most of a ticket. The two failure modes are symmetrical and both silent: a probe that
applies nothing looks like a passing test, and a restore that reverts too much looks like a clean
tree.

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

## Comments: fewer, and only where the code cannot speak

The default is no comment, in every file: source, tests, scripts and config. Code, types and
test names already carry most of the meaning, and a comment that restates them is a second thing
that has to stay true.

**When one is truly needed, it is one to three lines at most**, written in the same plain English
as the PR bodies above. If it needs more than three lines, the reasoning belongs in `docs/` and
the comment is a one-line link to it. PER-42 deleted most of the
comments written before it, not because they were wrong, but because they were history,
restatement, or rationale that belonged in a spec.

Write one only when it is one of these:

- **A constraint the code cannot show.** Dexie loses its transaction zone across a non-Dexie
  `await`. IndexedDB cannot index `null`. iOS evicts storage after 7 days. Nobody infers these
  from reading the lines around them.
- **A deliberate choice that looks like a mistake.** `nextFreeSlot` scans for the lowest free
  index rather than counting the party, because a death leaves a gap. Without the note the next
  reader "simplifies" it and reintroduces the bug.
- **A guarantee a caller must not break.** `restoreMany` writes `updatedAt` verbatim, where `put`
  always re-stamps it.

Never for:

- **Ticket numbers, commit numbers or milestones.** `PER-16`, "commit 9", "M2 fills this in".
  Linear and `git log` already hold this and stay correct when the code moves. Source does not.
- **What a ticket used to say, or who decided what.** That is a commit message.
- **Future work.** A comment describing what PER-41 will do is wrong the day PER-41 lands, and
  nothing fails when it rots.
- **Restating the signature.** `/** Throws when used outside a StorageProvider. */` above a
  function that throws when used outside a `StorageProvider`.
- **Rationale longer than three lines.** That is a design decision. It goes in `docs/` or in this
  file, and the code links to it.

### How the survivors read

Plain, direct English, in short sentences.

- No em dashes. A full stop or a comma does the same work.
- No semicolons joining clauses. Split the sentence instead.
- No ALL-CAPS emphasis. A point that needs shouting usually means the code needs changing.
- No stacked parentheticals, and no sentence carrying three subordinate clauses.
- A file header is one or two lines on what the file is for, not an essay.

The check before keeping one: read it, then imagine it deleted. If nothing is lost, delete it.

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
and item pickers search **all generations**. A randomiser or a romhack can put anything anywhere,
so a picker scoped to the tracked game cannot represent what the player actually caught, and
blocking them from logging it is worse than showing too many options. The randomiser sub-toggles
already existed to defeat these constraints; a constraint that must be defeatable was never a
constraint.

**The species picker takes a selection, not free text — decided 2026-09-21.** Typing filters the
list and a fully typed name counts as choosing it, but a name the pokedex does not know leaves
the field unset and the form refuses to save. This narrows the rule above: *all generations*
still holds, *anything typed* does not. A romhack's fakemon is hand-authored into
`src/game/data/pokedex/species.ts` first, which is already how game data is meant to be added.

Ability and held item are still free text. There is no `searchAbilities` or `searchItems` to
select from, only `searchSpecies`, so the same rule cannot apply to them yet.

**The moveset editor takes a selection too — decided 2026-09-21.** Same rule as the species
picker: typing filters `searchMoves`, a fully typed move name counts as choosing it, and a name
the pokedex does not know leaves the slot empty. This amends the "free-text" half of the
consequence below; the "over every move" half stands, since a move picked here is never filtered
by a species' learnset.

Consequences, all deliberate:

- **Learnsets are not stored.** The moveset editor is a selection over every move, not filtered
  by species. Filtering by a species' legal set is exactly the constraint being removed.
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

- ~~**Visual direction.** shadcn defers this rather than answering it.~~ **Resolved
  2026-09-22:** Block Shadow, chosen from four directions and drawn across every screen. See
  `docs/design/block-shadow.md`. M0–M2 shipped on stock shadcn, so applying it is its own work.
- **Desktop/mobile issue split.** Currently one responsive issue per screen.
- ~~The randomiser toggle ("hides known encounter tables")~~ **Resolved 2026-09-17:** the app does
  not show expected encounters per route. PER-8 is closed and no encounter tables are stored.
  Reword that toggle's label when PER-18 builds the rules screen.
- Run stats screen and distraction-free logging mode are noted in the design but never
  drawn. They need design before they are buildable.

---

## Pull requests — one per ticket, Theo merges

From 2026-09-18 onward, work lands through a reviewed PR, not directly on `main`.

- **One branch and one PR per Linear issue.** Use the branch name Linear supplies on the issue
  (e.g. `theosaurus13/per-16-08-new-run-name-and-game-picker`) so it links automatically.
- **Never push to `main`, and never merge.** Theo verifies the change by hand and merges when
  satisfied. Opening the PR is where your work stops.
- **The gate runs before the PR opens**, not after:
  `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`.
- Link the Linear issue.
- **No tool-attribution lines** in commit messages or PR bodies — no `Co-Authored-By`, no
  "Generated with Claude Code". This follows Theo's global config and applies here too.

### Size: small enough to review in one sitting

- **Aim for under 500 changed lines. Over 1000 is a hard limit.** Count additions plus
  deletions from `git diff --stat main...HEAD`.
- Lockfiles, generated game data and binary assets such as wireframe PNGs do not count, but say
  in the PR that they are there.
- Going over 1000 needs a real reason, stated at the top of the PR: for example, a change that
  cannot be split without leaving `main` broken in between. "It was quicker in one go" is not one.
- **Split the ticket rather than the rule.** If a ticket looks like it will pass 500 lines, say
  so and propose smaller tickets before building. Each piece should work and pass the gate on
  its own.

### Writing the PR body

This repo is a portfolio piece. Hiring managers and other non-engineers may read the PRs, not
just Theo. **Write for someone who knows what the app does but has not read the code.**

- Plain English, short sentences. No filler ("this PR aims to", "robust", "seamless",
  "leverage"), and no big words where a small one works.
- Name things by what the user sees, not what the code calls them. "The species list in the
  encounter dialog", not "`SpeciesCombobox` popover portal".
- Technical detail is fine when a reviewer needs it, but put it in the notes, not the summary.
- Keep each section short. A few lines or bullets, not paragraphs.

Use these four sections, in this order. `.github/pull_request_template.md` fills them in on GitHub,
and `gh pr create --body` does not use it, so paste the same shape:

```markdown
## Summary
What changed and why, in two to four sentences. Link the Linear issue.

## How to check it
- [ ] Short, exact steps a reviewer can follow by hand, each with what they should see.
- [ ] Call out anything a test cannot cover, like layout at phone width or anything visual.

## Impact on the app
What a user of the app will notice. Say plainly if nothing visible changes, and whether saved
runs are affected in any way.

## Notes
What is deliberately out of scope, so a missing thing does not read as an oversight.
Follow-up tickets, known gaps, and any size-limit justification go here too.
```

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
