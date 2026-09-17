/**
 * Settings screen (PER-10). Export/import is the backup CLAUDE.md hard rule 5 requires — see
 * `@/storage/backup.ts` for why a bad import must never be able to destroy good data.
 *
 * No visual design work here: CLAUDE.md's "still open" section leaves the hand-drawn look
 * unresolved, so this is existing shadcn primitives (`Button`) plus plain Tailwind, laid out as
 * inline sections rather than a modal dialog component — there is no shadcn Dialog in this repo
 * yet, and one isn't needed to make preview/confirm work.
 */

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { ExportBundle } from "@/domain/schema";
import {
  downloadBundle,
  exportBundle,
  importBundle,
  parseBundle,
  previewImport,
  type ImportMode,
  type ImportSummary,
} from "@/storage/backup";
import { usePersistenceStatus } from "@/storage/persistence";
import { useRuns } from "@/storage/queries";
import { useStorage } from "@/storage/storage-context";

interface PendingImport {
  bundle: ExportBundle;
  fileName: string;
}

export function SettingsScreen(): ReactNode {
  const status = usePersistenceStatus();
  const adapter = useStorage();
  const queryClient = useQueryClient();
  const runsQuery = useRuns();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[] | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const existingRuns = runsQuery.data ?? [];
  const preview = pending ? previewImport(pending.bundle, mode, existingRuns) : null;

  async function handleExport(): Promise<void> {
    const bundle = await exportBundle(adapter);
    downloadBundle(bundle);
  }

  function resetImportState(): void {
    setPending(null);
    setReplaceAcknowledged(false);
    setParseErrors(null);
    setImportSummary(null);
    setImportError(null);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Clear the input's value so picking the SAME file again still fires a change event.
    event.target.value = "";
    if (!file) {
      return;
    }

    resetImportState();

    const text = await file.text();
    const result = parseBundle(text);
    if (!result.ok) {
      setParseErrors(result.errors);
      return;
    }
    setPending({ bundle: result.bundle, fileName: file.name });
  }

  function handleCancelImport(): void {
    setPending(null);
    setReplaceAcknowledged(false);
  }

  function handleModeChange(nextMode: ImportMode): void {
    setMode(nextMode);
    setReplaceAcknowledged(false);
  }

  async function handleConfirmImport(): Promise<void> {
    if (!pending) {
      return;
    }
    setBusy(true);
    setImportError(null);
    try {
      const summary = await importBundle(adapter, pending.bundle, mode);
      setImportSummary(summary);
      setPending(null);
      setReplaceAcknowledged(false);
      // Everything may have changed (a merge adds whole runs; a replace erases and rewrites
      // every table), so invalidate every cached query rather than one run's keys —
      // `invalidateRun` is per-run and is not sufficient here.
      await queryClient.invalidateQueries();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = mode === "merge" || replaceAcknowledged;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <div>
        <h1 className="text-xl">Settings</h1>
        <p className="mt-4 text-sm">Storage persistence: {status ?? "checking…"}</p>
      </div>

      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="font-medium">Export</h2>
        <p className="text-muted-foreground text-sm">
          Downloads every run as a single JSON file. This is the app's only backup — do this before
          switching devices, and periodically otherwise.
        </p>
        <Button onClick={() => void handleExport()}>Export data</Button>
      </section>

      <section className="space-y-3 border-t border-border pt-4">
        <h2 className="font-medium">Import</h2>
        <p className="text-muted-foreground text-sm">
          Restores from a JSON file previously produced by Export.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(event) => void handleFileChange(event)}
          className="text-sm"
        />

        {parseErrors && (
          <div
            role="alert"
            className="space-y-1 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <p className="font-medium text-destructive">
              This file could not be imported. {parseErrors.length}{" "}
              {parseErrors.length === 1 ? "problem" : "problems"} found:
            </p>
            <ul className="list-inside list-disc">
              {parseErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {importError && (
          <p role="alert" className="text-sm text-destructive">
            Import failed: {importError}. Nothing was written — imports are all-or-nothing.
          </p>
        )}

        {importSummary && (
          <div className="space-y-1 rounded border border-border p-3 text-sm">
            <p className="font-medium">Import complete ({importSummary.mode}).</p>
            <p>
              Imported {importSummary.imported.length}{" "}
              {importSummary.imported.length === 1 ? "run" : "runs"}
              {importSummary.imported.length > 0
                ? `: ${importSummary.imported.map((run) => run.name).join(", ")}`
                : "."}
            </p>
            {importSummary.skipped.length > 0 && (
              <p>
                Skipped {importSummary.skipped.length} existing{" "}
                {importSummary.skipped.length === 1 ? "run" : "runs"} (left untouched):{" "}
                {importSummary.skipped.map((run) => run.name).join(", ")}
              </p>
            )}
            <p className="text-muted-foreground">
              Rows written — routes: {importSummary.rowCounts.routes}, encounters:{" "}
              {importSummary.rowCounts.encounters}, mons: {importSummary.rowCounts.mons}, deaths:{" "}
              {importSummary.rowCounts.deaths}, fights: {importSummary.rowCounts.fights}
            </p>
          </div>
        )}

        {preview && (
          <div className="space-y-3 rounded border border-border p-3 text-sm">
            <p className="font-medium">Preview: {pending?.fileName}</p>

            <fieldset className="flex gap-4">
              <legend className="mb-1 text-muted-foreground">Mode</legend>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "merge"}
                  onChange={() => handleModeChange("merge")}
                />
                Merge — add new runs only
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "replace"}
                  onChange={() => handleModeChange("replace")}
                />
                Replace — erase everything first
              </label>
            </fieldset>

            <p>
              {preview.toImport.length} {preview.toImport.length === 1 ? "run" : "runs"} would be
              imported
              {preview.toImport.length > 0
                ? `: ${preview.toImport.map((run) => run.name).join(", ")}`
                : "."}
            </p>
            {mode === "merge" && preview.toSkip.length > 0 && (
              <p>
                {preview.toSkip.length} existing {preview.toSkip.length === 1 ? "run" : "runs"}{" "}
                would be skipped (already present, left untouched):{" "}
                {preview.toSkip.map((run) => run.name).join(", ")}
              </p>
            )}
            <p className="text-muted-foreground">
              Rows to write — routes: {preview.rowCounts.routes}, encounters:{" "}
              {preview.rowCounts.encounters}, mons: {preview.rowCounts.mons}, deaths:{" "}
              {preview.rowCounts.deaths}, fights: {preview.rowCounts.fights}
            </p>

            {mode === "replace" && (
              <div className="space-y-2 rounded border border-destructive/40 bg-destructive/10 p-3">
                <p className="font-medium text-destructive">
                  Replace erases ALL current runs and their data before writing this file. This
                  cannot be undone.
                </p>
                <Button variant="outline" size="sm" onClick={() => void handleExport()}>
                  Export current data first
                </Button>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={replaceAcknowledged}
                    onChange={(event) => setReplaceAcknowledged(event.target.checked)}
                    className="mt-0.5"
                  />
                  I understand this will permanently erase all current data.
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant={mode === "replace" ? "destructive" : "default"}
                disabled={!canConfirm || busy}
                onClick={() => void handleConfirmImport()}
              >
                {busy ? "Importing…" : mode === "replace" ? "Erase and import" : "Import"}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={handleCancelImport}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
