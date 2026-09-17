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
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Every commit in the history passes all four.

---

## Project structure

```
src/
  domain/        entity types and pure state transitions — imports nothing
  storage/       adapter interface, Dexie + in-memory implementations, query layer
  game/          static game data: species/moves/abilities, HeartGold routes and bosses
  features/      screens, one directory each
  app/           routing and the responsive shell
  components/ui/ shadcn primitives
scripts/         build-time data generators (not run by the build)
docs/            design specs
```

Dependencies point one way: `features → storage → domain`. `domain/` imports from none of
the others, which is what makes the game rules testable without a database.

---

## Architecture

Three places, in increasing depth:

- **`CLAUDE.md`** — the decisions and the six hard rules everything answers to. Read this
  before changing anything structural.
- **`docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md`** — the M0 design spec:
  table shapes, the adapter interface, the commit plan.
- **[Building for Permadeath](https://claude.ai/artifact/Rw58g8ixMfXcLD2RB6JwQQ)** — a
  narrative walkthrough of *why* the architecture is shaped this way, written for someone
  joining cold. (Hosted on claude.ai, private unless shared.)

Two things worth knowing before you touch the storage layer:

1. **Only `src/storage/` may import Dexie.** ESLint enforces it — a breach fails `pnpm lint`.
   Everything else talks to the `StorageAdapter` interface, so milestone M6 can swap in native
   SQLite without the app noticing.
2. **The contract suite is the real artefact.** `src/storage/adapter.contract.ts` tests the
   *interface*, not an implementation, and runs against both the Dexie and in-memory adapters.
   A new adapter proves itself by passing that file unchanged.

---

## Regenerating game data

The species, route and roster data in `src/game/data/` is generated at build time and
**committed**. The generators do not run during `pnpm build` or `pnpm test` — the emitted
modules are what ships, so the app never needs the network.

You only need these when the source data changes:

```bash
# Routes and boss rosters, from a local clone of domtronn/nuzlocke.data
node scripts/extract-heartgold.ts /path/to/nuzlocke.data

# Species, moves, abilities and items, from PokéAPI
POKEDEX_CACHE_DIR=/tmp/pokeapi-cache node scripts/extract-pokedex.ts
```

Both cache their responses, so a rerun is cheap. Run `pnpm format` afterwards — the
generators do not format their own output, and `format:check` is part of the gate.

> **If you edit generated data by hand, put the correction in the generator.** Committed
> output whose script cannot reproduce it has no provenance. `scripts/extract-heartgold.ts`
> has a `LEVEL_CORRECTIONS` table for exactly this — upstream had a boss's roster level wrong,
> and the fix lives in the pipeline rather than in the emitted file.

---

## Testing

204 tests. They cover the domain rules, both storage adapters via the shared contract, the
query layer, the game data's invariants, and the app shell's routing.

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
