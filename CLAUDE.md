# Nuzlocke Tracker

A personal Pokémon Nuzlocke run tracker. Web app first, installable mobile app later.
Single user — there is no multi-user story and no plan for one.

**Status: pre-implementation.** No code yet. Once the app is scaffolded, add build/test/lint
commands to a "Commands" section here.

Source design: Claude Design project `52583f86-cc91-43e2-b2f3-b592e7fcec36`
("Nuzlocke Tracker Wireframes") — 10 screens, each drawn for desktop sidebar and mobile
bottom-tab shells. These are **wireframes, not a design system**; do not treat the
Patrick Hand / sketch-border styling as the intended visual direction.

Backlog, milestones and dependency order:
https://claude.ai/code/artifact/18a760bb-38e5-4834-98f6-348d08002270

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

**2. UUID-keyed flat tables per aggregate** — `runs`, `encounters`, `mons`, `deaths`,
`fights`. Never autoincrement keys. Every record carries its own `updatedAt`.

**3. Never model a run as one nested JSON blob.** This is the obvious V1 shortcut and it
forces a full re-model before any sync tool can be adopted. Row-shaped data or nothing.

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

## Game data

No single source covers this. Two are combined:

- **PokéAPI** — species, types, abilities, learnsets, evolutions, and wild encounter tables
  via `/pokemon/{id}/encounters` (the only source with method *and* level). Gen 8 is
  incomplete and Gen 9 absent; Gen 2–5 is decent but has had real bugs. Spot-check anything
  level-cap-sensitive against a walkthrough.
- **`domtronn/nuzlocke.data`** — `routes/*.txt` for route order, `leagues/*.txt` for gym,
  Elite Four and rival rosters. Hand-curated; nothing else has trainer rosters at all.
  PokéAPI has never had trainer data (feature requests #432 and #580 are still open).

**Unresolved licence question:** `nuzlocke.data` has no LICENSE file, and the sibling app
repo's BSD-3-Clause does not automatically extend to it. **Do not vendor it wholesale until
Theo has confirmed terms with the maintainer.** Using it as a reference to hand-author our
own dataset is safe regardless, and is the fallback.

**Level caps are derived**, not sourced — take the ace (highest-level) mon per boss. They
are a community convention, not a game mechanic, so no API will ever return them.

**Scope: HeartGold only for V1.** Every additional game is a whole curated dataset, not a
config flag. Build the ingest pipeline so a second game is additive.

---

## Still open — do not assume

- **Visual direction.** shadcn defers this rather than answering it. Do not invest in a
  polish pass until Theo decides whether the hand-drawn look is real.
- **Desktop/mobile issue split.** Currently one responsive issue per screen.
- The randomiser toggle ("hides known encounter tables") implies the app normally *shows*
  expected encounters per route — a feature nothing in the wireframes draws. Unresolved.
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
