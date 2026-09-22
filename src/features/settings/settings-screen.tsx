/** Export/import UI. See `@/storage/backup.ts` for the validation and atomicity guarantees. */

import { useState, type ChangeEvent, type ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { ExportBundle } from "@/domain/schema";
import { SquareCheckbox } from "@/components/square-checkbox";
import { FIELD_LABEL_CLASS } from "@/features/encounters/mon-fields";
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

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[] | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const existingRuns = runsQuery.data ?? [];
  const preview = pending ? previewImport(pending.bundle, mode, existingRuns) : null;

  async function handleExport(): Promise<void> {
    setExportError(null);
    try {
      const bundle = await exportBundle(adapter);
      downloadBundle(bundle);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
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
    // Clear the input's value so picking the same file again still fires a change event.
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
      // A merge adds whole runs and a replace erases and rewrites every table, so invalidate
      // every cached query rather than one run's keys. `invalidateRun` is per-run and isn't
      // sufficient here.
      await queryClient.invalidateQueries();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = mode === "merge" || replaceAcknowledged;

  return (
    <div>
      <div className="border-b-[1.5px] border-border p-4">
        <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Storage persistence: {status ?? "checking…"}
        </p>
      </div>

      <div className="max-w-2xl space-y-8 p-4">
        <section className="space-y-2">
          <h2 className={FIELD_LABEL_CLASS}>Export</h2>
          <p className="text-sm text-muted-foreground">
            Downloads every run as a single JSON file. This is the app&rsquo;s only backup — do this
            before switching devices, and periodically otherwise.
          </p>
          <Button onClick={() => void handleExport()}>Export data</Button>
          {exportError && (
            <p role="alert" className="text-sm text-destructive">
              Export failed: {exportError}. Nothing was saved.
            </p>
          )}
        </section>

        <section className="space-y-3 border-t-[1.5px] border-border pt-6">
          <h2 className={FIELD_LABEL_CLASS}>Import</h2>
          <p className="text-sm text-muted-foreground">
            Restores from a JSON file previously produced by Export.
          </p>

          {/* `file:` styles the control's own button, so the picker keeps its native behaviour
              and its accessible name. */}
          <input
            type="file"
            accept="application/json"
            onChange={(event) => void handleFileChange(event)}
            className="text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground file:shadow-block hover:file:bg-muted"
          />

          {parseErrors && (
            <div
              role="alert"
              className="space-y-1 border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm shadow-block-alert"
            >
              <p className="font-medium text-destructive">
                This file could not be imported.{" "}
                <span className="font-mono">{parseErrors.length}</span>{" "}
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
            <div className="space-y-1 border-[1.5px] border-border bg-card p-3 text-sm shadow-block">
              <p className="font-medium">Import complete ({importSummary.mode}).</p>
              <p>
                Imported <span className="font-mono">{importSummary.imported.length}</span>{" "}
                {importSummary.imported.length === 1 ? "run" : "runs"}
                {importSummary.imported.length > 0
                  ? `: ${importSummary.imported.map((run) => run.name).join(", ")}`
                  : "."}
              </p>
              {importSummary.skipped.length > 0 && (
                <p>
                  Skipped <span className="font-mono">{importSummary.skipped.length}</span> existing{" "}
                  {importSummary.skipped.length === 1 ? "run" : "runs"} (left untouched):{" "}
                  {importSummary.skipped.map((run) => run.name).join(", ")}
                </p>
              )}
              <p className="text-muted-foreground">
                Rows written — routes:{" "}
                <span className="font-mono">{importSummary.rowCounts.routes}</span>, encounters:{" "}
                <span className="font-mono">{importSummary.rowCounts.encounters}</span>, mons:{" "}
                <span className="font-mono">{importSummary.rowCounts.mons}</span>, deaths:{" "}
                <span className="font-mono">{importSummary.rowCounts.deaths}</span>, fights:{" "}
                <span className="font-mono">{importSummary.rowCounts.fights}</span>
              </p>
            </div>
          )}

          {preview && (
            <div className="space-y-3 border-[1.5px] border-border bg-card p-3 text-sm shadow-block">
              <p className="font-medium">Preview: {pending?.fileName}</p>

              <fieldset className="space-y-2">
                <legend className={FIELD_LABEL_CLASS}>Mode</legend>
                <div className="flex flex-wrap gap-4">
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
                </div>
              </fieldset>

              <p>
                <span className="font-mono">{preview.toImport.length}</span>{" "}
                {preview.toImport.length === 1 ? "run" : "runs"} would be imported
                {preview.toImport.length > 0
                  ? `: ${preview.toImport.map((run) => run.name).join(", ")}`
                  : "."}
              </p>
              {mode === "merge" && preview.toSkip.length > 0 && (
                <p>
                  <span className="font-mono">{preview.toSkip.length}</span> existing{" "}
                  {preview.toSkip.length === 1 ? "run" : "runs"} would be skipped (already present,
                  left untouched): {preview.toSkip.map((run) => run.name).join(", ")}
                </p>
              )}
              <p className="text-muted-foreground">
                Rows to write — routes:{" "}
                <span className="font-mono">{preview.rowCounts.routes}</span>, encounters:{" "}
                <span className="font-mono">{preview.rowCounts.encounters}</span>, mons:{" "}
                <span className="font-mono">{preview.rowCounts.mons}</span>, deaths:{" "}
                <span className="font-mono">{preview.rowCounts.deaths}</span>, fights:{" "}
                <span className="font-mono">{preview.rowCounts.fights}</span>
              </p>

              {mode === "replace" && (
                <div className="space-y-2 border-[1.5px] border-destructive bg-destructive/10 p-3 shadow-block-alert">
                  <p className="font-medium text-destructive">
                    Replace erases ALL current runs and their data before writing this file. This
                    cannot be undone.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void handleExport()}>
                    Export current data first
                  </Button>
                  {exportError && (
                    <p role="alert" className="text-sm text-destructive">
                      Export failed: {exportError}. Nothing was saved.
                    </p>
                  )}
                  <label className="flex items-start gap-2">
                    <SquareCheckbox
                      id="replace-acknowledged"
                      checked={replaceAcknowledged}
                      onChange={() => {
                        setReplaceAcknowledged((previous) => !previous);
                      }}
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
    </div>
  );
}
