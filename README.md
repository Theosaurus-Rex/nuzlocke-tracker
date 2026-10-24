# Nuzlocke Tracker

A personal Pokémon Nuzlocke run tracker. Local-first React app, HeartGold only at V1,
installable as a mobile app later via Capacitor.

There is no backend and no account system. Your data lives in your browser, and the JSON
export is the backup.

**Status:** milestones M0 to M3 are done. M4 (progression and rules) and M5 (polish) are under
way, and M6 (mobile packaging) has not started. The backlog and dependency order are in the
Linear project, linked from `CLAUDE.md`.

---

## What it does

A Nuzlocke is a way of playing a Pokémon game to make it harder. You may catch only the first
Pokémon you meet on each route, and if one of your Pokémon faints, it is dead for good. This app
keeps the record of one of those runs, so you do not have to track it on paper.

What it covers today:

- **Routes.** Every route in HeartGold, in order, with a dialog to log what you met there. The
  dupes clause is checked when you log a catch.
- **Party.** Your six, with their moves, held items and nature. Drag to reorder them.
- **Boxes.** Everything else you have caught, in a grid or a sortable list. Drag a Pokémon
  between a box and the party.
- **Graveyard.** Log a death with its cause and see the fallen on a timeline.
- **Gyms and Elite Four.** Gym leaders, the Elite Four, the Champion and rival fights, with the
  ace level for each, and the current level cap. Mark them cleared and record what you lost to them.
- **Evolve.** Move a Pokémon to its next stage without losing its history.
- **Multiple runs.** Keep several runs at once, each with its own rules.
- **Backup.** Export every run to one JSON file, and import it back on any device.
- **Sample run.** In dev builds, one button loads a sample run to try the screens.

---

## Requirements

| | |
|---|---|
| Node | 20 or newer (built on 24) |
| pnpm | 9.15.9 — pinned in `packageManager` |

pnpm is pinned, so let corepack pick the right version rather than relying on a global install:

```bash
corepack enable
```

---

## Setup

```bash
pnpm install
pnpm dev
```

`pnpm dev` serves the app at the URL Vite prints. On first load it opens an IndexedDB
database called `nuzlocke-tracker` and calls `navigator.storage.persist()` — the result is
reported on the Settings screen and affects nothing else.

Netlify builds it from `netlify.toml`, which runs the gate minus the browser tests and serves
`index.html` for every path so deep links work.

---

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b` then `vite build` — typecheck is part of the build |
| `pnpm preview` | Serve the production build |
| `pnpm typecheck` | Types only, no emit |
| `pnpm lint` / `pnpm lint:fix` | ESLint, including the storage-boundary rule |
| `pnpm format` / `pnpm format:check` | Prettier (Markdown is excluded) |
| `pnpm test` | Vitest, once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm test:e2e` | Playwright browser tests on a production build |
| `pnpm test:e2e:ui` | Playwright in its interactive UI mode |

**The gate before any commit:**

```bash
pnpm exec playwright install chromium   # once, for test:e2e
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm test:e2e
```

Every commit in the history passes the whole gate.

---

## Project structure

```
src/
  domain/        entity types and pure state transitions, imports nothing
  storage/       adapter interface, Dexie + in-memory implementations, query layer
  game/          HeartGold and SoulSilver routes and bosses, natures, and the live PokéAPI client
  game/pokeapi/  fetch, map and resolve species and move data from PokéAPI, cached by TanStack Query
  features/      screens, one directory each
  app/           routing, the responsive shell, and lazy loading of each screen
  components/    shared Block Shadow components: Typography, Surface, chips, sprites
  components/ui/ shadcn primitives
  lib/           small helpers: the shared query client, class names, gender symbols
  test/          shared test factories, PokéAPI fixtures and render helpers
e2e/             Playwright specs, plus the shared fixtures in e2e/support/
scripts/         one-shot generators and tooling (not run by the build)
docs/            design specs, the visual direction, the wireframes and longer notes
```

Dependencies point one way: `features → storage → domain`. `domain/` imports from none of
the others, which is what makes the game rules testable without a database. `game/` is a leaf
holding the HeartGold and SoulSilver routes and bosses plus the live PokéAPI client. Both `features/` and
`storage/` read it, and it imports only from `domain/`. `components/` and `lib/` are shared by
`features/` and never import from it or from `storage/`. `app/` sits on top and loads the screens.

---

## Architecture

Two places, in increasing depth:

- **`CLAUDE.md`** — the decisions and the six hard rules everything answers to, plus the
  testing conventions and the comment standard. Read this before changing anything structural.
- **`docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md`** — the M0 design spec:
  table shapes, the adapter interface, the commit plan.

Screens are drawn in `docs/wireframes/`, one PNG per frame. Build to the hi-fi frames under
`hifi/frames/`; the lo-fi set under `frames/` is history. Issues name the frames they are built
from, and `docs/wireframes/README.md` maps each frame to its screen.

- **`docs/design/block-shadow.md`** — the visual direction: palette, type, borders and shadows,
  chips. Read it before styling anything.

Two things worth knowing before you touch the storage layer:

1. **Only `src/storage/` may import Dexie.** ESLint enforces it — a breach fails `pnpm lint`.
   Everything else talks to the `StorageAdapter` interface, so milestone M6 can swap in native
   SQLite without the app noticing.
2. **The contract suite is the real artefact.** `src/storage/adapter.contract.ts` tests the
   *interface*, not an implementation, and runs against both the Dexie and in-memory adapters.
   A new adapter proves itself by passing that file unchanged.

---

## Game data

Species and move data comes from PokéAPI, fetched at runtime through `src/game/pokeapi/` and
cached by TanStack Query. It is never copied into the repo, so looking one up needs a network
connection. Natures and the type list are hand-written constants in `src/game/natures.ts` and
`src/game/types.ts`.

The route and roster data in `src/game/data/` is **ours**, committed to the repo. A generator
(`scripts/extract-*.ts`) is a one-shot bootstrapper: run it once to seed a new game. After
that, the files it wrote belong to us — hand-editing them is the normal, expected workflow,
not a special case. That covers fixing an upstream error, trimming what we don't need, or
tuning values to suit the app. Hand-authored romhack datasets were always the end state here,
so this is the same workflow applied to data that happened to be seeded from somewhere.

The generator does not run during `pnpm build` or `pnpm test`.

Seed a new game with:

```bash
# Routes and boss rosters, from a local clone of domtronn/nuzlocke.data
node scripts/extract-heartgold.ts /path/to/nuzlocke.data
```

It refuses to run if its output directory already has generated files in it — re-running
against an already-seeded game would silently overwrite every hand correction with upstream's
current values. Pass `--force` if you genuinely mean to re-seed from scratch, and diff the
result before committing.

Run `pnpm format` afterwards — the generator does not format its own output, and
`format:check` is part of the gate.

### Adding a game

A game is its data directory under `src/game/data/`, one entry in `GAMES` in
`src/game/registry.ts`, and one id in `GAME_IDS` in `src/domain/types.ts`. The registry is typed
`Record<GameId, GameData>`, so `pnpm typecheck` fails if an id has no entry or an entry has no
id. Nothing else names a game: screens read the run's game through `useRunGame`, and the new run
screen lists whatever the registry holds.

To bootstrap a second game from nuzlocke.data, copy `scripts/extract-heartgold.ts` and adapt it.
`docs/notes/scripts.md` says what to re-derive. A romhack is the same shape, written by hand.

Two versions of one game, such as a pair, can share a dataset. Spread the shared `GameData` into a
second entry with its own `id` and `name`, and add the id to `GAME_IDS`. SoulSilver does this in
`src/game/data/heartgold/index.ts`: its routes and boss rosters are HeartGold's, and only the
wild encounters differ, which the app does not store.

`src/game/game-data.test.ts` runs its invariants over every game in the registry: contiguous
route orders, unique ids, and a valid level cap table. A new game gets them for free.

After editing a game's data, check its species names against PokéAPI. This needs a network
connection and is not part of the gate:

```bash
node scripts/check-game-data.ts
```

It lists every roster species that is not a real PokéAPI pokemon name and exits non-zero if
there are any. Species are plain strings, so the compiler cannot catch a typo.

**Correct the data file, not the generator.** If you find an upstream error or want to tune a
value, edit the committed file directly and say why in a comment beside the change, so the
next reader knows it was deliberate rather than a transcription slip.

---

## Wireframes

One image per frame, cut from a canvas export. Issues cite frames by name
(`**Wireframe:** 5h, 6d (hi-fi) · 2g, 1d-4 (lo-fi)`), so the PNG is what you open.
`docs/wireframes/README.md` indexes them and maps each lo-fi frame to its hi-fi replacement.

- **`docs/wireframes/hifi/frames/*.png`** — the finished design, in the Block Shadow direction.
  Build to these.
- `docs/wireframes/frames/*.png` — the earlier lo-fi set, kept because the issues still cite it.

Re-slice only after re-exporting a canvas — the PNGs are committed:

```bash
pnpm exec playwright install chromium             # headless Chromium, for the HTML export
node scripts/slice-hifi-wireframes.ts --force

brew install poppler                              # pdftotext and pdftoppm, for the PDF
node scripts/slice-wireframes.ts --force
```

---

## Testing

`pnpm test` covers the domain rules, both storage adapters via the shared contract, the query
layer, the game data's invariants, the app shell's routing, and the screens.

`pnpm test:e2e` runs Playwright against a production build, in a desktop and a mobile project.
Specs live in `e2e/`: the shell, drag and drop, logging a catch and a death, JSON backup and an
accessibility scan. PokéAPI is stubbed from the unit-test fixtures and the sprite hosts are
blocked, so the tests run offline, and a request to any other host fails the test. Run
`pnpm exec playwright install chromium` once first. The `e2e` GitHub Actions workflow runs them
on every pull request and uploads the report when they fail.

In dev builds, Settings has a Developer section with a "Load sample run" button. It adds a
run with a gapped party, enough boxed Pokémon to fill a box, deaths, open and skipped routes, a
custom route, and every fight cleared up to Bugsy with a death at him. That lets screens be
checked by hand. The section is compiled out of production builds.

Two conventions worth keeping:

- **Verify a new guarantee by watching the suite go red.** Break the thing deliberately, run
  `pnpm test`, confirm it fails *for the right reason*, then restore. Several tests in this
  repo passed while testing nothing until they were checked this way.
- **The breakpoint is checked in a browser, not in jsdom.** jsdom does not evaluate CSS media
  queries, so a unit test asserting "the tab bar shows at 375px" would pass regardless of the
  classes. `e2e/shell.spec.ts` checks the sidebar and tab bar in Chromium at both widths.

---

## Known gaps

- Six tab items at 320px is untested layout. The browser tests check 767px and 768px, and a
  Pixel 7 phone.
