# Nuzlocke Tracker — scaffold and foundations

**Date:** 2026-09-17
**Covers:** PER-5 (01 · data model), PER-9 (03a · storage adapter), PER-11 (04 · app shell),
PER-12 (05 · shadcn and theme tokens) — the four M0 issues that are not blocked on game data.

## 1. Scope

This spec takes the repository from empty to a running, responsive app shell backed by real
IndexedDB persistence, with the data model fixed and the storage boundary enforced.

**In scope**

- Repository, toolchain, lint, test harness
- The data model: six tables, their fields, and the transitions between them
- The export bundle shape and `schemaVersion`
- The storage adapter interface, its contract test suite, and a Dexie implementation
- The TanStack Query layer that sits over the adapter
- Routing and the desktop-sidebar / mobile-tab-bar shell, with placeholder screens

**Out of scope**

- PER-6 (02a · route and roster data) — blocked on the `nuzlocke.data` licence question
- PER-7, PER-8 (02b, 02c · PokéAPI adapters) — `src/game/` is a typed stub only
- PER-10 (03b · JSON import) — the export *shape* is fixed here, the import flow is not built
- Every screen's actual content; M1–M4 own those
- dnd-kit, not needed until M3
- Any visual direction beyond default shadcn tokens. CLAUDE.md holds this open deliberately

## 2. Stack

Versions are current majors as of 2026-09-17, not the ones named in CLAUDE.md where those have
since moved on.

| Concern | Choice | Note |
|---|---|---|
| Build | Vite 8 | |
| UI | React 19 | |
| Language | TypeScript 6, `strict` | Not 7 — see below |
| Routing | React Router 8, declarative mode | Not framework mode. No loaders, no `route.ts` |
| Styling | Tailwind 4 | CSS-first `@theme`, no `tailwind.config.js` |
| Components | shadcn/ui (CLI 4) | |
| Server state | TanStack Query 5 | Over the adapter, never over Dexie |
| Tables | TanStack Table 9 | Installed at M2 when the route table lands |
| Storage | Dexie 4 | Behind the adapter, imported in exactly one directory |
| Package manager | pnpm 9 | |
| Lint / format | ESLint flat config + Prettier | |
| Test | Vitest 5 + React Testing Library | `fake-indexeddb` for adapter tests |

**TypeScript is pinned to 6.0.x, deliberately below `latest`.** TypeScript 7 (7.0.2) is the
current release, but `typescript-eslint` 8.70 declares `typescript: ">=4.8.4 <6.1.0"`, so
adopting 7 would leave the project with no type-aware linting — and the storage-boundary rule in
§3 is the thing that enforces hard rule 1. 6.0.x is the newest version inside that range and is
what `create-vite` itself pins. Revisit when `typescript-eslint` widens its peer range; the
upgrade should be a version bump and nothing else.

React Router is at v8; v7 is a year old. v8's declarative mode is the same API surface that was
approved — `createBrowserRouter` with plain route objects — so this is a version bump, not a
change of approach. Hash routing is a one-line swap at M6 if Capacitor's `file://` origin needs
it; nothing in the shell assumes path routing.

dnd-kit is deliberately not installed. When M3 arrives, verify that `@dnd-kit/sortable` 10.x
peers against `@dnd-kit/core` 6.x before pinning — CLAUDE.md's "v6 line" rule refers to `core`,
and the two packages version independently.

## 3. Layering

```
src/
  game/          static game data + PokéAPI adapters    (stub until 02a/02b/02c)
  storage/       adapter interface, Dexie impl, query layer
  domain/        entity types, transitions, derivations  (pure, no I/O)
  features/      screens, one directory per screen
  components/ui/ shadcn primitives
  lib/           cross-cutting helpers
```

Dependencies point one way: `features` → `storage` → `domain`, and `features` → `domain`.
`domain` imports nothing from the other three. It holds the entity types and the pure functions
that move an entity between states, which makes the rules testable without a database.

### Enforcing the storage boundary

Hard rule 1 says nothing outside the storage layer touches Dexie. An ESLint
`no-restricted-imports` rule fails the build when anything outside `src/storage/` imports
`dexie` or `dexie-react-hooks`. A convention that only lives in a document gets broken during
the first awkward feature; a lint rule does not.

Components import hooks from `src/storage/queries.ts` and never see the adapter itself. That
gives two swappable seams rather than one: the adapter can be replaced at M6, and the query
layer can be replaced without touching the adapter.

## 4. Data model

Six tables. Every record is keyed by a UUID from `crypto.randomUUID()`, never an autoincrement,
and every record carries its own `updatedAt`. The adapter stamps `updatedAt` on write so no
caller can forget it.

Field types below are TypeScript. `?` means the column is nullable.

### `runs`

| Field | Type | Note |
|---|---|---|
| `id` | `string` | uuid |
| `name` | `string` | |
| `game` | `GameId` | `'heartgold'` is the only member at V1 |
| `status` | `'active' \| 'finished'` | |
| `rules` | `Rules` | embedded, see below |
| `createdAt` | `string` | ISO 8601 |
| `updatedAt` | `string` | |
| `finishedAt` | `string?` | |

`Rules` is embedded on the run rather than being its own table. It is a fixed-shape value object
with no independent identity that is never queried on its own. Hard rule 3 forbids modelling a
*run* as one nested blob — its encounters, mons and deaths are rows — and a config struct on the
run row is not that.

```ts
type Rules = {
  dupesClause: boolean
  speciesClause: boolean
  shinyClause: boolean
  nicknamesRequired: boolean
  levelCaps: boolean
  setMode: boolean
  hardcore: boolean
  randomiser: {
    enabled: boolean
    wildEncounters: boolean
    trainers: boolean
    starters: boolean
    abilities: boolean
    items: boolean
    moves: boolean
    evolutions: boolean
  }
  customClause: string | null
}
```

**Corrected 2026-09-18 (PER-18):** the table below originally claimed each randomiser sub-toggle
invalidated a picker that was otherwise constrained by seeded game data. That premise is gone —
CLAUDE.md's "Pickers are never constrained to one generation" decision (2026-09-17) made every
species/ability/move/item picker free-text over all generations regardless of these flags, and
learnsets were never stored. PER-8 (wild encounter tables) was also cancelled, so there is no
encounter table for `wildEncounters` to hide. None of the sub-toggles change app behaviour today;
they are read back only as a record of what kind of run this is (PER-18's rules screen, PER-41's
rules summary). `evolutions` is the one with a plausible future consequence, at PER-37's evolve
action — nothing has been built against it yet.

| Toggle | Effect on the UI |
|---|---|
| `wildEncounters` | None. Recorded for the run summary; the app never showed encounter tables (PER-8 cancelled) |
| `abilities` | None. The ability picker is already unconstrained for every run — see "Pickers are never constrained to one generation" |
| `items` | None. The held-item picker is already unconstrained for every run |
| `moves` | None. Learnsets are not stored; the moveset editor (PER-34) is already free-text over every move |
| `evolutions` | None yet. Recorded for the run summary; PER-37's evolve action may read it to allow a free species choice, but that is unbuilt |
| `trainers`, `starters` | None. Always metadata — recorded for the run summary, never a picker consequence |

This matters at M0 only insofar as the flags must exist on the run before M4 (PER-41) reads them
back. Nothing enforces or displays them before then.

### `routes`

| Field | Type | Note |
|---|---|---|
| `id` | `string` | |
| `runId` | `string` | indexed |
| `name` | `string` | |
| `order` | `number` | traversal order; sparse integers to allow insertion |
| `isCustom` | `boolean` | true for user-appended routes |
| `gameRouteId` | `string?` | links back to seeded game data; null when custom |
| `createdAt` / `updatedAt` | `string` | |

Routes are per-run rows, not global game data. Custom routes (PER-22) and reordering both need
per-run identity, and per-run rows make a run self-contained for export. Creating a run copies
the seeded list for its game into rows.

### `encounters`

| Field | Type | Note |
|---|---|---|
| `id` | `string` | |
| `runId` | `string` | indexed |
| `routeId` | `string` | indexed |
| `status` | `'open' \| 'caught' \| 'missed' \| 'skipped'` | |
| `speciesId` | `string?` | what was met; null while open |
| `level` | `number?` | level encountered at |
| `monId` | `string?` | set when caught |
| `notes` | `string?` | |
| `createdAt` / `updatedAt` | `string` | |

**"Dead" is not an encounter status.** The route table renders a dead state by following
`encounter.monId → mon.status`. Storing death on both the encounter and the mon is two sources
of truth, and they will drift the first time a death is logged.

### `mons`

| Field | Type | Note |
|---|---|---|
| `id` | `string` | |
| `runId` | `string` | indexed |
| `encounterId` | `string?` | null for starters and gifts |
| `speciesId` | `string` | current species; mutates on evolve |
| `speciesIdCaught` | `string` | fixed at catch |
| `nickname` | `string?` | required when `rules.nicknamesRequired` |
| `gender` | `'male' \| 'female' \| 'genderless' \| null` | |
| `level` | `number` | |
| `levelCaught` | `number` | |
| `nature` | `string?` | |
| `ability` | `string?` | |
| `heldItem` | `string?` | |
| `moves` | `string[]` | max 4, validated in `domain` |
| `status` | `'party' \| 'box' \| 'dead'` | indexed |
| `partySlot` | `number?` | 0–5; set iff `status === 'party'` |
| `boxOrder` | `number?` | |
| `caughtRouteId` | `string?` | |
| `createdAt` / `updatedAt` | `string` | |

Evolution (PER-37) mutates `speciesId` while `speciesIdCaught` stays fixed. That preserves the
caught-location history the issue asks for without an evolution history table.

### `deaths`

The fields that are true of *every* death stay flat on the row. Only the cause varies, so the
cause is a single discriminated union in one column. This avoids a matrix of mutually-exclusive
nullable columns where the reader has to guess which apply.

| Field | Type | Note |
|---|---|---|
| `id` | `string` | |
| `runId` | `string` | indexed |
| `monId` | `string` | indexed, one death per mon |
| `level` | `number` | level when it died |
| `routeId` | `string?` | where it happened |
| `cause` | `Cause` | see below |
| `diedAt` | `string` | |
| `notes` | `string?` | |
| `createdAt` / `updatedAt` | `string` | |

```ts
type StatusCause =
  | 'poison'
  | 'burn'
  | 'sandstorm'
  | 'hail'
  | 'recoil'
  | 'perish-song'
  | 'confusion'

type Cause =
  | { type: 'trainer'; fightId: string | null; trainerName: string | null;
      species: string; level: number; move: string }
  | { type: 'wild';    species: string; level: number; move: string }
  | { type: 'status';  status: StatusCause }
  | { type: 'other';   detail: string }
```

The `status` variant carries no free text: `deaths.notes` already exists on every row, so a
second free-text field on one variant would just be a place for the same sentence to end up
half the time. The enum is closed on purpose — a death that does not fit it is `other`, which
is what that variant is for.

The four variants are exactly PER-30's four cause types, so the form's radio group maps
one-to-one onto the discriminant. The graveyard renderer becomes an exhaustive `switch`: adding
a fifth cause later fails compilation at every consumer that has not handled it, which is the
behaviour worth having on a table this hard to backfill.

`cause.fightId` is an indexed dotted keypath — Dexie supports these, and the index is sparse, so
only trainer deaths appear in it. A fight's casualties are therefore a query, not a join table.
`trainerName` beside it is the untracked-trainer case, the random bug catcher who lands a crit.
Exactly one of `fightId` and `trainerName` is set; because both live inside a single variant,
that constraint is expressible in one type rather than spread across four loose columns.

**`StatusCause` is deliberately incomplete and cheap to extend.** Adding a member is not a
migration — every existing row still holds a valid value, so no `schemaVersion` bump is needed
and no data has to be rewritten. That is the reason it is worth declaring now rather than
leaving the variant as free text and narrowing it later, which *would* have been a migration.

Gen 4 offers plenty more that can kill a mon and none are included yet: leech seed, curse,
nightmare, entry hazards on switch-in, trapping-move residual damage, Rough Skin and other
contact abilities, Destiny Bond, Struggle recoil, self-destruct. Each is a one-line addition
when it first comes up in a run. Until then they are `other`, which loses the filterable
discriminant but nothing else — `notes` still records what happened.

### `fights`

| Field | Type | Note |
|---|---|---|
| `id` | `string` | |
| `runId` | `string` | indexed |
| `gameFightId` | `string?` | links to seeded roster data; null when custom |
| `name` | `string` | |
| `kind` | `'gym' \| 'elite_four' \| 'champion' \| 'rival' \| 'custom'` | |
| `order` | `number` | |
| `grantsBadge` | `boolean` | drives the badge count |
| `levelCap` | `number?` | derived from the boss's ace at ingest |
| `status` | `'pending' \| 'cleared'` | |
| `clearedAt` | `string?` | |
| `createdAt` / `updatedAt` | `string` | |

No attempt tracking. A fight is pending or cleared; the mons lost along the way are `deaths`
whose `cause.fightId` points here. The cost of this is that losing to a gym leader without
losing a mon leaves no record — no screen in the wireframes shows attempt history, so that
trade is accepted.

### Derived state

Never stored, computed in `domain` and consumed through the query layer: caught / missed / dead
/ boxed / party counts, badge count, current level cap, per-route display status, and whether a
mon is over the cap. PER-20 calls for the derivation to be written once rather than per screen;
`src/domain/derive.ts` is that one place.

## 5. State transitions

Pure functions in `src/domain/transitions.ts`, each taking current state and returning the rows
to write. The adapter persists what they return; they perform no I/O.

```
encounter: open ──catch──→ caught   (creates a mon; party if party < 6, else box)
           open ──miss───→ missed
           open ──skip───→ skipped

mon:       party ←──────→ box
           party ──die──→ dead      (creates a death row)
           box   ──die──→ dead      (creates a death row)

fight:     pending ──clear──→ cleared
```

Death is terminal. There is no revive transition — this is a permadeath tracker, and an undo
that resurrects a mon would need to unwind every derived counter. Correcting a mistaken death is
deletion of the death row plus restoring the mon's prior status, which is an explicit repair
path rather than a modelled transition.

Catching sets `encounter.status = 'caught'`, creates the mon, and links `encounter.monId`. All
three writes happen in one adapter transaction; a partial write here would leave an encounter
pointing at a mon that does not exist.

## 6. Export format

```ts
type ExportBundle = {
  schemaVersion: number        // 1
  exportedAt: string
  runs: Run[]
  routes: Route[]
  encounters: Encounter[]
  mons: Mon[]
  deaths: Death[]
  fights: Fight[]
}
```

Flat arrays, one per table, mirroring the row shapes exactly. `SCHEMA_VERSION` is defined in the
commit that defines the model, per hard rule 4, and `adapter.exportAll()` is built here even
though the import flow is PER-10. Fixing the shape now means nothing has to be renamed when
import lands.

## 7. Storage adapter interface

```ts
interface Repository<T extends { id: string }> {
  get(id: string): Promise<T | undefined>
  getAll(): Promise<T[]>
  where<K extends IndexedKey<T>>(field: K, value: T[K]): Promise<T[]>
  put(record: Draft<T>): Promise<T>
  putMany(records: Draft<T>[]): Promise<T[]>
  delete(id: string): Promise<void>
}

interface StorageAdapter {
  init(): Promise<void>
  runs: Repository<Run>
  routes: Repository<Route>
  encounters: Repository<Encounter>
  mons: Repository<Mon>
  deaths: Repository<Death>
  fights: Repository<Fight>
  transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>
  exportAll(): Promise<ExportBundle>
  clear(): Promise<void>
}
```

`Draft<T>` makes `id`, `createdAt` and `updatedAt` optional. `put` assigns a UUID when `id` is
absent and always stamps `updatedAt`, so hard rule 2's per-record `updatedAt` cannot be
forgotten by a caller.

`where` is constrained to indexed fields via `IndexedKey<T>`, declared per table. An unindexed
query is a type error rather than a silent full-table scan that only bites once a run has 31
routes of data. Anything compound gets a named method on the adapter instead.

`transaction` hands the callback a scoped adapter so nested writes join the outer transaction.
The Dexie implementation maps this to `db.transaction`; SQLite maps it to `BEGIN`/`COMMIT`.

Nothing in this interface exposes a capability Dexie has and SQLite lacks — no `liveQuery`, no
observables. Reactivity is the query layer's problem, which is what keeps the M6 swap a
drop-in.

## 8. Query layer

`src/storage/queries.ts` owns every query key and exports hooks.

```
['runs']                        ['runs', runId]
['routes', runId]               ['encounters', runId]
['mons', runId]                 ['deaths', runId]
['fights', runId]
```

Mutations invalidate by run: a write touching a run's data invalidates that run's keys. At this
data volume — kilobytes, one user — refetching a run's rows is cheaper than maintaining
fine-grained invalidation, and it removes a whole class of stale-cache bugs. `staleTime` is
`Infinity` with explicit invalidation, since nothing changes the database except this tab.

## 9. App shell

Routes:

```
/                          run list
/runs/new                  new run wizard
/runs/:runId               → redirect to /runs/:runId/routes
/runs/:runId/routes        route list and encounter logging
/runs/:runId/party
/runs/:runId/boxes
/runs/:runId/graveyard
/runs/:runId/fights
/settings                  export / import, storage diagnostics
```

Every screen is a placeholder in this work; M1–M4 fill them. The shell switches at the `md`
breakpoint (768px): a persistent sidebar at and above it, a fixed bottom tab bar below, with the
same navigation items and the same active-state logic driving both. One `<AppShell>` renders
both variants from one config array rather than two component trees that drift apart.

`navigator.storage.persist()` is called once at startup as hygiene. Its result is logged and
surfaced on the settings screen, and nothing is architected on the assumption it succeeded —
hard rule 5.

## 10. Testing

- **Domain transitions** — unit tests, pure in and out, no database
- **Storage adapter** — a `describe`-level contract suite, `createAdapterContractTests(factory)`,
  written against the *interface*. It runs against the Dexie implementation now over
  `fake-indexeddb`, and the same file proves the SQLite implementation at M6. This is the main
  thing that makes the adapter boundary pay for itself
- **Query layer** — hooks tested against an in-memory adapter, verifying invalidation
- **Shell** — one render test per breakpoint confirming sidebar and tab bar swap

Playwright is not set up. There is nothing to drive end-to-end until M1 exists.

## 11. Commit sequence

Each commit leaves the repo green — `pnpm lint && pnpm test && pnpm build` passes at every one.

| # | Commit | Issue |
|---|---|---|
| 1 | `docs: add scaffold and foundations design spec` | — |
| 2 | `chore: scaffold vite, react and typescript` | — |
| 3 | `chore: add tailwind and shadcn/ui` | PER-12 |
| 4 | `chore: add eslint, prettier and vitest` | — |
| 5 | `docs: update CLAUDE.md for the scaffolded state` | — |
| 6 | `feat: define the data model and export schema` | PER-5 |
| 7 | `feat: add storage adapter interface and contract tests` | PER-9 |
| 8 | `feat: implement the dexie storage adapter` | PER-9 |
| 9 | `feat: add tanstack query layer over the adapter` | PER-9 |
| 10 | `feat: add app shell with sidebar and tab bar` | PER-11 |

Commit 7 lands the contract suite before any implementation exists, so the tests fail first and
the Dexie implementation in commit 7 is what makes them pass.

## 12. Open questions carried forward

These are not resolved here and none of them block this work:

- Visual direction. shadcn defaults only; no polish pass until the hand-drawn question is settled
- The `nuzlocke.data` licence, which gates PER-6 and therefore all seeded route and roster data
- Whether the app shows expected encounters per route, implied by the randomiser toggle's
  "hides known encounter tables" label but drawn nowhere
- Run stats screen and distraction-free logging mode, both undesigned
