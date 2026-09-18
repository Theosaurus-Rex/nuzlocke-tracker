/**
 * Covers the settings screen's import flow against the in-memory adapter: a malformed file is
 * refused with legible errors, a valid file previews before anything is written, and replace
 * mode can't be confirmed until the destructive checkbox is ticked. Validation, atomicity and
 * round-trip properties live in `@/storage/backup.test.ts`. This file only covers the screen's
 * own wiring.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION } from "@/domain/schema";
import type { Run } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { SettingsScreen } from "./settings-screen";

const RULES_FIXTURE: Run["rules"] = {
  dupesClause: false,
  speciesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: {
    enabled: false,
    wildEncounters: false,
    trainers: false,
    starters: false,
    abilities: false,
    items: false,
    moves: false,
    evolutions: false,
  },
  customClause: null,
};

function makeRunDraft(overrides: Partial<Run> = {}): Omit<Run, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Existing Run",
    game: "heartgold",
    status: "active",
    rules: RULES_FIXTURE,
    finishedAt: null,
    ...overrides,
  };
}

function renderScreen(adapter: StorageAdapter): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <SettingsScreen />
      </StorageProvider>
    </QueryClientProvider>,
  );
}

function jsonFile(content: unknown, name = "backup.json"): File {
  return new File([JSON.stringify(content)], name, { type: "application/json" });
}

async function uploadFile(file: File): Promise<void> {
  const fileInput = document.querySelector('input[type="file"]');
  if (!(fileInput instanceof HTMLInputElement)) {
    throw new Error("expected a file input to be rendered");
  }
  await userEvent.upload(fileInput, file);
}

describe("SettingsScreen — export", () => {
  it("surfaces the error when exportAll rejects", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    adapter.exportAll = () => Promise.reject(new Error("disk full"));
    renderScreen(adapter);

    await userEvent.click(screen.getByRole("button", { name: "Export data" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Export failed: disk full. Nothing was saved.",
      );
    });
  });
});

describe("SettingsScreen — import", () => {
  it("refuses a malformed file and lists what was wrong", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    renderScreen(adapter);

    await uploadFile(jsonFile({ schemaVersion: SCHEMA_VERSION, exportedAt: "x" })); // missing table keys

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not be imported/i);
    });
  });

  it("previews a valid file before writing anything, and merge-imports on confirm", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const existing = await adapter.runs.put(makeRunDraft());
    renderScreen(adapter);

    await waitFor(() => expect(adapter).toBeDefined());

    const bundle = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      runs: [
        {
          id: "incoming-run",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          ...makeRunDraft({ name: "Incoming Run" }),
        },
      ],
      routes: [],
      encounters: [],
      mons: [],
      deaths: [],
      fights: [],
    };

    await uploadFile(jsonFile(bundle));

    await waitFor(() => {
      expect(screen.getByText(/Preview: backup\.json/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 run would be imported: Incoming Run/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByText(/Import complete \(merge\)/)).toBeInTheDocument();
    });

    expect(await adapter.runs.get("incoming-run")).toBeDefined();
    // Left completely untouched.
    expect(await adapter.runs.get(existing.id)).toEqual(existing);
  });

  it("disables the replace confirmation until the destructive checkbox is ticked", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    renderScreen(adapter);

    const bundle = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      runs: [
        {
          id: "incoming-run",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          ...makeRunDraft({ name: "Incoming Run" }),
        },
      ],
      routes: [],
      encounters: [],
      mons: [],
      deaths: [],
      fights: [],
    };

    await uploadFile(jsonFile(bundle));
    await waitFor(() => {
      expect(screen.getByText(/Preview: backup\.json/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("radio", { name: /Replace/ }));

    const confirmButton = screen.getByRole("button", { name: "Erase and import" });
    expect(confirmButton).toBeDisabled();

    await userEvent.click(
      screen.getByRole("checkbox", { name: /permanently erase all current data/i }),
    );
    expect(confirmButton).toBeEnabled();
  });
});
