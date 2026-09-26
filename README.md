# Nuzlocke Tracker

A personal Pokémon Nuzlocke run tracker. Local-first React app, HeartGold only at V1,
installable as a mobile app later via Capacitor.

There is no backend and no account system. Your data lives in your browser, and the JSON
export is the backup.

**Status:** milestone M0 (foundations) complete — data model, storage layer, game data,
app shell. Screens are placeholders until M1.

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

**The gate before any commit:**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build
```

Every commit in the history passes all five.

---

## Project structure

```
src/
  domain/        entity types and pure state transitions — imports nothing
  storage/       adapter interface, Dexie + in-memory implementations, query layer
  game/          HeartGold routes and bosses, natures, and the live PokéAPI client
  game/pokeapi/  fetch, map and resolve species and move data from PokéAPI, cached by TanStack Query
  features/      screens, one directory each
  app/           routing and the responsive shell
  components/    shared Block Shadow components: Typography, Surface, chips
  components/ui/ shadcn primitives
scripts/         one-shot generators and tooling (not run by the build)
docs/            design specs, the visual direction, and the wireframes
```

Dependencies point one way: `features → storage → domain`. `domain/` imports from none of
the others, which is what makes the game rules testable without a database. `game/` is a leaf
holding HeartGold's routes and bosses plus the live PokéAPI client. Both `features/` and
`storage/` read it, and it imports only types from `domain/`.

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
layer, the game data's invariants, and the app shell's routing.

Two conventions worth keeping:

- **Verify a new guarantee by watching the suite go red.** Break the thing deliberately, run
  `pnpm test`, confirm it fails *for the right reason*, then restore. Several tests in this
  repo passed while testing nothing until they were checked this way.
- **No breakpoint tests.** jsdom does not evaluate CSS media queries, so a test asserting
  "the tab bar shows at 375px" would pass regardless of the classes. The responsive switch
  needs a real browser; there is deliberately no test pretending otherwise.

---

## Known gaps

- The desktop/mobile CSS breakpoint is unverified — needs a browser or Playwright check.
- Five tab items at 320px is untested layout.
- Visual direction is deliberately undecided; the UI is unstyled shadcn defaults on purpose.
