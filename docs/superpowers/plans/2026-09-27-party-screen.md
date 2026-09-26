# Party Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the party placeholder with the hi-fi party screen: one always-open card per party mon, in slot order.

**Architecture:** `PartyScreen` reads the run, routes and mons through the existing storage hooks, filters and orders with one pure function, and renders a grid of `PartyCard`s. Each card shows type badges, name line, a 2x2 grid of `MoveChip`s and a footer. `MoveChip` resolves the move's type for the run's generation through PokéAPI.

**Tech Stack:** React 19, TypeScript 6, Tailwind 4, TanStack Query, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-27-party-screen-design.md`

## Global Constraints

- pnpm only. The gate is `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`.
- Components never import Dexie or the adapter. Data comes from `@/storage/queries` hooks.
- Headings and paragraphs use `<Typography>` from `@/components/typography`. No raw `h1`–`h6` or `p` in `src/features/**`, and no `text-[...]` arbitrary sizes there. Lint enforces this.
- Nullable fields are `| null`, never `?`.
- Comments: default none. At most 1–3 plain-English lines, only for a constraint the code cannot show. No ticket numbers.
- Commit messages: lowercase conventional prefix (`feat:`, `refactor:`, `test:`, `docs:`), no attribution lines of any kind.
- Never restore a file with `git checkout --`. Probes restore from a `cp` backup.
- Do the work yourself. Do NOT spawn subagents.

## Review Focus

1. **A party with gaps in its slots** (0, 2, 5, the state every death leaves) must still render in slot order. Pinned in Task 4.
2. **Mons stored out of slot order** (slot 3 created before slot 0) must render by slot, not by creation. Pinned in Task 4.
3. **A mon with almost nothing filled in** (no nickname, gender, nature, ability, item or route) must render without stray `·` separators or blank gaps. Pinned in Task 3.
4. **A move whose type changed across generations** (Charm: Normal before gen 6, Fairy after) must show the tracked game's type. Pinned in Task 2.
5. **PokéAPI unreachable** (offline mid-run) must still show every move name, with a neutral circle. Pinned in Task 2.

---

### Task 1: Shared helpers for gender and type colour

Pure refactor, no behaviour change. The existing suite is the test.

**Files:**
- Create: `src/lib/gender.ts`
- Modify: `src/features/routes/route-presentation.tsx` (remove `genderSymbol`, import it)
- Modify: `src/components/type-badge.tsx` (export the colour map)

**Interfaces:**
- Produces: `genderSymbol(gender: Gender | null): string | null` from `@/lib/gender`
- Produces: `TYPE_FILL: Record<TypeBadgeType, string>` from `@/components/type-badge` (the renamed `TYPE_CLASSES`)

- [ ] **Step 1: Create `src/lib/gender.ts`**

```ts
import type { Gender } from "@/domain/types";

export function genderSymbol(gender: Gender | null): string | null {
  if (gender === "male") return "♂";
  if (gender === "female") return "♀";
  return null;
}
```

- [ ] **Step 2: Remove `genderSymbol` from `route-presentation.tsx` and import it**

Delete the `export function genderSymbol ...` block (lines 18–22). Add `import { genderSymbol } from "@/lib/gender";` to the imports. If `Gender` is now unused in that file's `import type { Gender, Mon }`, drop it. Then find any other importer:

Run: `grep -rn "genderSymbol" src`
Every importer must import from `@/lib/gender`. Fix any that import from `route-presentation`.

- [ ] **Step 3: Export the type colour map**

In `src/components/type-badge.tsx` rename `const TYPE_CLASSES` to `export const TYPE_FILL` and update its one use inside `TypeBadge`.

- [ ] **Step 4: Run the gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass, same test count as before.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gender.ts src/features/routes/route-presentation.tsx src/components/type-badge.tsx
git commit -m "refactor: share genderSymbol and the type colour map"
```

---

### Task 2: MoveChip

**Files:**
- Create: `src/features/party/move-chip.tsx`
- Test: `src/features/party/move-chip.test.tsx`

**Interfaces:**
- Consumes: `TYPE_FILL`, `TypeBadgeType` from `@/components/type-badge`; `useMove` from `@/game/pokeapi/queries`; `moveStatsIn`, `moveDisplayName` from `@/game/pokeapi/resolve`
- Produces: `MoveChip({ name, generation }: { name: string; generation: number }): ReactNode`. Renders a `span` wrapper, a decorative `aria-hidden` circle, then the display name. The circle carries `bg-type-<type>` when resolved, `bg-background` otherwise.

- [ ] **Step 1: Write the failing tests**

The fixtures in `src/test/pokeapi-fixtures.ts` include `charm` (Fairy now, Normal through gen 5) and `vine-whip` (Grass).

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultPokeApiRoutes, stubPokeApi, STUB_NETWORK_ERROR } from "@/test/pokeapi-fetch";

import { MoveChip } from "./move-chip";

function renderChip(name: string, generation: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MoveChip name={name} generation={generation} />
    </QueryClientProvider>,
  );
}

function circle(container: HTMLElement): Element {
  const found = container.querySelector("[aria-hidden='true']");
  if (found === null) throw new Error("no type circle rendered");
  return found;
}

describe("MoveChip", () => {
  it("colours Charm as Normal in a gen 4 run", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { container } = renderChip("charm", 4);
    await waitFor(() => expect(circle(container)).toHaveClass("bg-type-normal"));
    expect(circle(container)).not.toHaveClass("bg-type-fairy");
  });

  it("colours Charm as Fairy in a gen 6 run", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { container } = renderChip("charm", 6);
    await waitFor(() => expect(circle(container)).toHaveClass("bg-type-fairy"));
  });

  it("shows the move's display name", () => {
    stubPokeApi(defaultPokeApiRoutes);
    renderChip("vine-whip", 4);
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
  });

  it("keeps the name and a neutral circle when the fetch fails", async () => {
    const fetchMock = stubPokeApi({ ...defaultPokeApiRoutes, "/move/vine-whip": STUB_NETWORK_ERROR });
    const { container } = renderChip("vine-whip", 4);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(circle(container)).toHaveClass("bg-background"));
    expect(circle(container).className).not.toMatch(/bg-type-/);
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
  });
});
```

If `moveDisplayName("vine-whip")` does not produce `"Vine Whip"`, check `titleCase` in `src/game/pokeapi/resolve.ts` and use what it actually returns. Do not change `titleCase`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/features/party/move-chip.test.tsx`
Expected: FAIL, cannot resolve `./move-chip`.

- [ ] **Step 3: Implement `src/features/party/move-chip.tsx`**

```tsx
import type { ReactNode } from "react";

import { TYPE_FILL } from "@/components/type-badge";
import { Typography } from "@/components/typography";
import { useMove } from "@/game/pokeapi/queries";
import { moveDisplayName, moveStatsIn } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";

export interface MoveChipProps {
  name: string;
  generation: number;
}

export function MoveChip({ name, generation }: MoveChipProps): ReactNode {
  const move = useMove(name);
  const type = move.data ? moveStatsIn(move.data, generation).type : null;
  const fill = type !== null && type !== "unknown" ? TYPE_FILL[type] : "bg-background";

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("size-5 shrink-0 rounded-full border-[1.5px] border-border", fill)}
      />
      <Typography as="span" variant="body">
        {moveDisplayName(name)}
      </Typography>
    </span>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/features/party/move-chip.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Probe that the generation test can fail**

```bash
F=src/features/party/move-chip.tsx
cp "$F" "$TMPDIR/move-chip.bak"
sed -i '' 's/moveStatsIn(move.data, generation).type/move.data.type/' "$F"
grep -n "move.data.type" "$F"          # confirm the probe applied
pnpm test src/features/party/move-chip.test.tsx   # expect: "colours Charm as Normal" FAILS
cp "$TMPDIR/move-chip.bak" "$F"
pnpm test src/features/party/move-chip.test.tsx   # green again
```

If the Normal test stays green under the probe, the test is fake. Fix the test before going on.

- [ ] **Step 6: Commit**

```bash
git add src/features/party/move-chip.tsx src/features/party/move-chip.test.tsx
git commit -m "feat: add a move chip coloured by the move's type in the tracked generation"
```

---

### Task 3: PartyCard

**Files:**
- Create: `src/features/party/party-card.tsx`
- Test: `src/features/party/party-card.test.tsx`

**Interfaces:**
- Consumes: `MoveChip` (Task 2); `genderSymbol` from `@/lib/gender` (Task 1); `SpeciesTypeBadge` from `@/components/species-type-badge`; `Surface` from `@/components/surface`; `speciesDisplayName` from `@/game/pokeapi/resolve`
- Produces: `PartyCard({ mon, routeName, generation }: { mon: Mon; routeName: string | null; generation: number }): ReactNode`. Renders a `Surface as="li"`, so the caller wraps cards in a `ul`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { PartyCard } from "./party-card";

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    runId: "run-1",
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

function renderCard(mon: Mon, routeName: string | null = null) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ul>
        <PartyCard mon={mon} routeName={routeName} generation={4} />
      </ul>
    </QueryClientProvider>,
  );
}

describe("PartyCard", () => {
  it("shows every detail of a fully filled-in mon", () => {
    renderCard(
      makeMon({
        nickname: "Leafy",
        gender: "female",
        level: 22,
        nature: "Adamant",
        ability: "Overgrow",
        heldItem: "Miracle Seed",
        moves: ["vine-whip", "tackle"],
      }),
      "Route 29",
    );
    expect(screen.getByRole("heading", { name: "“Leafy”" })).toBeInTheDocument();
    expect(screen.getByText("Chikorita · ♀ · L22 · Adamant")).toBeInTheDocument();
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Miracle Seed · Overgrow · Route 29")).toBeInTheDocument();
  });

  it("falls back to the species name, unquoted, with no nickname", () => {
    renderCard(makeMon());
    expect(screen.getByRole("heading", { name: "Chikorita" })).toBeInTheDocument();
  });

  it("leaves out missing details without stray separators", () => {
    renderCard(makeMon());
    expect(screen.getByText("Chikorita · L5")).toBeInTheDocument();
    expect(screen.getByText("no item")).toBeInTheDocument();
    expect(screen.queryByText(/·\s*·|·\s*$|^\s*·/)).not.toBeInTheDocument();
  });

  it("shows the caught route even when item and ability are missing", () => {
    renderCard(makeMon(), "Route 46");
    expect(screen.getByText("no item · Route 46")).toBeInTheDocument();
  });
});
```

The heading's text is uppercased by CSS (`uppercase`), not in the DOM, so the accessible name keeps its case. The quotes are the curly `“` and `”` characters.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/features/party/party-card.test.tsx`
Expected: FAIL, cannot resolve `./party-card`.

- [ ] **Step 3: Implement `src/features/party/party-card.tsx`**

```tsx
import type { ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";

import { MoveChip } from "./move-chip";

export interface PartyCardProps {
  mon: Mon;
  routeName: string | null;
  generation: number;
}

function joinPresent(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null && part !== "").join(" · ");
}

export function PartyCard({ mon, routeName, generation }: PartyCardProps): ReactNode {
  const species = speciesDisplayName(mon.speciesId);
  const title = mon.nickname !== null ? `“${mon.nickname}”` : species;

  return (
    <Surface as="li" className="flex flex-col p-5">
      <SpeciesTypeBadge speciesId={mon.speciesId} generation={generation} />
      <Typography as="h2" variant="title" className="mt-3 uppercase">
        {title}
      </Typography>
      <Typography variant="body" tone="muted" className="mt-1">
        {joinPresent([species, genderSymbol(mon.gender), `L${mon.level}`, mon.nature])}
      </Typography>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t-[1.5px] border-border pt-4">
        {mon.moves.map((move) => (
          <li key={move}>
            <MoveChip name={move} generation={generation} />
          </li>
        ))}
      </ul>
      <Typography variant="body" className="mt-4 border-t border-border/30 pt-3">
        {joinPresent([mon.heldItem ?? "no item", mon.ability, routeName])}
      </Typography>
    </Surface>
  );
}
```

If `border-border/30` does not render as a lighter rule, use `border-muted` instead. Check `src/index.css` for the token names.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/features/party/party-card.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Probe the separator guarantee**

```bash
F=src/features/party/party-card.tsx
cp "$F" "$TMPDIR/party-card.bak"
sed -i '' 's/part !== null \&\& part !== ""/true/' "$F"
grep -n "filter((part): part is string => true)" "$F"   # confirm it applied
pnpm test src/features/party/party-card.test.tsx      # expect: "leaves out missing details" FAILS
cp "$TMPDIR/party-card.bak" "$F"
pnpm test src/features/party/party-card.test.tsx      # green again
```

If typecheck-only errors stop the probe from running, vitest still runs since it does not typecheck. If the test stays green, fix the test.

- [ ] **Step 6: Commit**

```bash
git add src/features/party/party-card.tsx src/features/party/party-card.test.tsx
git commit -m "feat: add the party card with moves, item, ability and caught route"
```

---

### Task 4: PartyScreen

**Files:**
- Modify: `src/features/party/party-screen.tsx` (replace the placeholder)
- Test: `src/features/party/party-screen.test.tsx`

**Interfaces:**
- Consumes: `PartyCard` (Task 3); `useRun`, `useRoutes`, `useMons` from `@/storage/queries`; `GAMES` from `@/game/registry`; `ScreenHeader` from `@/components/screen-header`
- Produces: `partyMembers(mons: readonly Mon[]): Mon[]` (exported for tests) and `PartyScreen(): ReactNode`

- [ ] **Step 1: Write the failing tests**

This follows `src/features/routes/routes-screen.test.tsx`: a memory adapter, a real router, and stubbed PokéAPI.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { PartyScreen, partyMembers } from "./party-screen";

type MonDraft = Omit<Mon, "id" | "createdAt" | "updatedAt">;

function makeMonDraft(runId: string, overrides: Partial<Mon> = {}): MonDraft {
  return {
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

async function seedRun(adapter: StorageAdapter) {
  return adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/party`]}>
          <Routes>
            <Route path="/runs/:runId/party" element={<PartyScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function cardHeadings(): Promise<string[]> {
  const headings = await screen.findAllByRole("heading", { level: 2 });
  return headings.map((heading) => heading.textContent ?? "");
}

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

describe("partyMembers", () => {
  it("keeps only party mons, ordered by slot across gaps", () => {
    const mon = (id: string, overrides: Partial<Mon>): Mon => ({
      ...makeMonDraft("run-1", overrides),
      id,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    });
    const result = partyMembers([
      mon("e", { partySlot: 5 }),
      mon("boxed", { status: "box", partySlot: null, boxOrder: 0 }),
      mon("a", { partySlot: 0 }),
      mon("dead", { status: "dead", partySlot: null }),
      mon("c", { partySlot: 2 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "c", "e"]);
  });
});

describe("PartyScreen", () => {
  it("shows party mons in slot order, not creation order, and skips box and dead mons", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Last", partySlot: 5 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Boxed", status: "box", partySlot: null, boxOrder: 0 }),
    );
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Gone", status: "dead", partySlot: null }),
    );
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Middle", partySlot: 2 }));

    renderScreen(adapter, run.id);

    expect(await cardHeadings()).toEqual(["“First”", "“Middle”", "“Last”"]);
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
  });

  it("names the route a mon was caught on", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const route = await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 1,
      isCustom: false,
      gameRouteId: null,
    });
    await adapter.mons.put(makeMonDraft(run.id, { caughtRouteId: route.id }));

    renderScreen(adapter, run.id);

    expect(await screen.findByText("no item · Route 29")).toBeInTheDocument();
  });

  it("says so when the party is empty", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one in your party yet")).toBeInTheDocument();
    expect(screen.getByText("0 of 6")).toBeInTheDocument();
  });
});
```

Check `createMemoryAdapter` and `adapter.runs.put` / `adapter.mons.put` / `adapter.routes.put` against `src/storage/adapter.ts` before running. The routes-screen test uses exactly these, so they should match. Check that `DEFAULT_RULES` is exported from `@/domain/rules`, as `routes-screen.tsx` imports it.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/features/party/party-screen.test.tsx`
Expected: FAIL, `partyMembers` is not exported.

- [ ] **Step 3: Implement `src/features/party/party-screen.tsx`**

```tsx
import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { PartyCard } from "./party-card";

const PARTY_SIZE = 6;

export function partyMembers(mons: readonly Mon[]): Mon[] {
  return mons
    .filter((mon) => mon.status === "party")
    .sort((a, b) => (a.partySlot ?? 0) - (b.partySlot ?? 0));
}

export function PartyScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const routesQuery = useRoutes(runId ?? "");
  const monsQuery = useMons(runId);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const party = partyMembers(monsQuery.data ?? []);
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));

  return (
    <div>
      <ScreenHeader title="Party">
        <Typography variant="body" tone="muted">
          {party.length} of {PARTY_SIZE}
        </Typography>
      </ScreenHeader>
      {!monsQuery.isPending && party.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one in your party yet
        </Typography>
      )}
      {party.length > 0 && (
        <ul className="grid gap-6 p-4 md:grid-cols-2">
          {party.map((mon) => (
            <PartyCard
              key={mon.id}
              mon={mon}
              routeName={
                mon.caughtRouteId === null ? null : (routeNames.get(mon.caughtRouteId) ?? null)
              }
              generation={generation}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
```

Match how `routes-screen.tsx` calls `useRun` and `useRoutes` when `runId` might be undefined. Copy its pattern rather than the `?? ""` above if it differs. Hooks must be called before the early `Navigate` return, as there.

`"{party.length} of {PARTY_SIZE}"` renders as separate text nodes. `getByText("3 of 6")` still matches, because Testing Library joins an element's text. If it does not match, build the string with a template literal.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/features/party/`
Expected: all party tests pass.

- [ ] **Step 5: Probe filter and sort**

```bash
F=src/features/party/party-screen.tsx
cp "$F" "$TMPDIR/party-screen.bak"

sed -i '' 's/mon.status === "party"/true/' "$F"
grep -n "filter((mon) => true)" "$F"
pnpm test src/features/party/party-screen.test.tsx   # expect: FAIL, box and dead mons appear
cp "$TMPDIR/party-screen.bak" "$F"

sed -i '' 's/(a.partySlot ?? 0) - (b.partySlot ?? 0)/0/' "$F"
grep -n "sort((a, b) => 0)" "$F"
pnpm test src/features/party/party-screen.test.tsx   # expect: FAIL, order wrong
cp "$TMPDIR/party-screen.bak" "$F"

pnpm test src/features/party/                        # green again
```

If either probe leaves the suite green, the test is fake. Fix it before committing.

- [ ] **Step 6: Commit**

```bash
git add src/features/party/party-screen.tsx src/features/party/party-screen.test.tsx
git commit -m "feat: show the party as cards in slot order"
```

---

### Task 5: Gate, README check, PR

- [ ] **Step 1: Full gate**

Run: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`
Expected: all five pass. If `format:check` fails, run `pnpm format`, check the diff, and commit it as `style: format`.

- [ ] **Step 2: Re-run the whole mutation battery**

Re-run the probes from Tasks 2, 3 and 4 once more, all against the final code. Each must go red, and the suite must be green after each restore.

- [ ] **Step 3: README check**

No script, version, top-level `src/` directory or generator changed. `src/lib/` already exists. Confirm with `git diff --stat origin/main...HEAD` that no README-relevant change slipped in. Nothing to update is the expected result.

- [ ] **Step 4: Size check**

Run: `git diff --stat origin/main...HEAD | tail -1`
Expected: under 500 changed lines. Over 1000 is a hard stop. Say so rather than open the PR.

- [ ] **Step 5: Look at it**

Run `pnpm dev`, create a run, log two or three catches with moves, items and abilities, and view Party at desktop width and at 390px. Check two columns on desktop and one on phone, with no horizontal scroll.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin theosaurus13/per-15-18-party-six-slots-with-per-mon-detail
gh pr create --title "18 · Party: six slots with per-mon detail" --body-file <body.md>
```

The body uses the four sections from CLAUDE.md (Summary, How to check it, Impact on the app, Notes), written for a non-engineer. Link https://linear.app/theo-harris-dev/issue/PER-15. Notes must list what is out of scope: over-cap badges (PER-40), empty slots and add from box (PER-17), drag (PER-17, PER-22), sprites and type glyphs (PER-56), and editing from the card. No attribution lines. Do not merge.
