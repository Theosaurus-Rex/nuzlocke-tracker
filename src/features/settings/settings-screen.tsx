/** Export/import UI. See `@/storage/backup.ts` for the validation and atomicity guarantees. */

import { useState, type ChangeEvent, type ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { ExportBundle } from "@/domain/schema";
import { ScreenHeader } from "@/components/screen-header";
import { SquareCheckbox } from "@/components/square-checkbox";
import { Surface } from "@/components/surface";
import { Typography } from "@/components/typography";
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
      <ScreenHeader title="Settings">
        <Typography variant="body" tone="muted">
          Storage persistence: {status ?? "checking…"}
        </Typography>
      </ScreenHeader>

      <div className="max-w-2xl space-y-8 p-4">
        <section className="space-y-2">
          <Typography as="h2" variant="eyebrow" className="mb-1">
            Export
          </Typography>
          <Typography variant="body" tone="muted">
            Downloads every run as a single JSON file. This is the app&rsquo;s only backup — do this
            before switching devices, and periodically otherwise.
          </Typography>
          <Button onClick={() => void handleExport()}>Export data</Button>
          {exportError && (
            <Typography role="alert" variant="body" tone="alert">
              Export failed: {exportError}. Nothing was saved.
            </Typography>
          )}
        </section>

        <section className="space-y-3 border-t-[1.5px] border-border pt-6">
          <Typography as="h2" variant="eyebrow" className="mb-1">
            Import
          </Typography>
          <Typography variant="body" tone="muted">
            Restores from a JSON file previously produced by Export.
          </Typography>

          {/* `file:` styles the control's own button, so the picker keeps its native behaviour
              and its accessible name. */}
          <input
            type="file"
            accept="application/json"
            onChange={(event) => void handleFileChange(event)}
            className="text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground file:shadow-block hover:file:bg-muted"
          />

          {parseErrors && (
            <Surface role="alert" tone="alert" className="space-y-1 p-3">
              <Typography variant="strong" tone="alert">
                This file could not be imported.{" "}
                <Typography variant="number">{parseErrors.length}</Typography>{" "}
                {parseErrors.length === 1 ? "problem" : "problems"} found:
              </Typography>
              <ul className="list-inside list-disc">
                {parseErrors.map((error, index) => (
                  <Typography as="li" key={index} variant="body">
                    {error}
                  </Typography>
                ))}
              </ul>
            </Surface>
          )}

          {importError && (
            <Typography role="alert" variant="body" tone="alert">
              Import failed: {importError}. Nothing was written — imports are all-or-nothing.
            </Typography>
          )}

          {importSummary && (
            <Surface className="space-y-1 p-3">
              <Typography variant="strong">Import complete ({importSummary.mode}).</Typography>
              <Typography variant="body">
                Imported <Typography variant="number">{importSummary.imported.length}</Typography>{" "}
                {importSummary.imported.length === 1 ? "run" : "runs"}
                {importSummary.imported.length > 0
                  ? `: ${importSummary.imported.map((run) => run.name).join(", ")}`
                  : "."}
              </Typography>
              {importSummary.skipped.length > 0 && (
                <Typography variant="body">
                  Skipped <Typography variant="number">{importSummary.skipped.length}</Typography>{" "}
                  existing {importSummary.skipped.length === 1 ? "run" : "runs"} (left untouched):{" "}
                  {importSummary.skipped.map((run) => run.name).join(", ")}
                </Typography>
              )}
              <Typography variant="body" tone="muted">
                Rows written — routes:{" "}
                <Typography variant="number">{importSummary.rowCounts.routes}</Typography>,
                encounters:{" "}
                <Typography variant="number">{importSummary.rowCounts.encounters}</Typography>,
                mons: <Typography variant="number">{importSummary.rowCounts.mons}</Typography>,
                deaths: <Typography variant="number">{importSummary.rowCounts.deaths}</Typography>,
                fights: <Typography variant="number">{importSummary.rowCounts.fights}</Typography>
              </Typography>
            </Surface>
          )}

          {preview && (
            <Surface className="space-y-3 p-3">
              <Typography variant="strong">Preview: {pending?.fileName}</Typography>

              <fieldset className="space-y-2">
                <Typography as="legend" variant="eyebrow" className="mb-1">
                  Mode
                </Typography>
                <div className="flex flex-wrap gap-4">
                  <Typography as="label" variant="body" className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="import-mode"
                      checked={mode === "merge"}
                      onChange={() => handleModeChange("merge")}
                    />
                    Merge — add new runs only
                  </Typography>
                  <Typography as="label" variant="body" className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="import-mode"
                      checked={mode === "replace"}
                      onChange={() => handleModeChange("replace")}
                    />
                    Replace — erase everything first
                  </Typography>
                </div>
              </fieldset>

              <Typography variant="body">
                <Typography variant="number">{preview.toImport.length}</Typography>{" "}
                {preview.toImport.length === 1 ? "run" : "runs"} would be imported
                {preview.toImport.length > 0
                  ? `: ${preview.toImport.map((run) => run.name).join(", ")}`
                  : "."}
              </Typography>
              {mode === "merge" && preview.toSkip.length > 0 && (
                <Typography variant="body">
                  <Typography variant="number">{preview.toSkip.length}</Typography> existing{" "}
                  {preview.toSkip.length === 1 ? "run" : "runs"} would be skipped (already present,
                  left untouched): {preview.toSkip.map((run) => run.name).join(", ")}
                </Typography>
              )}
              <Typography variant="body" tone="muted">
                Rows to write — routes:{" "}
                <Typography variant="number">{preview.rowCounts.routes}</Typography>, encounters:{" "}
                <Typography variant="number">{preview.rowCounts.encounters}</Typography>, mons:{" "}
                <Typography variant="number">{preview.rowCounts.mons}</Typography>, deaths:{" "}
                <Typography variant="number">{preview.rowCounts.deaths}</Typography>, fights:{" "}
                <Typography variant="number">{preview.rowCounts.fights}</Typography>
              </Typography>

              {mode === "replace" && (
                <Surface tone="alert" className="space-y-2 p-3">
                  <Typography variant="strong" tone="alert">
                    Replace erases ALL current runs and their data before writing this file. This
                    cannot be undone.
                  </Typography>
                  <Button variant="outline" size="sm" onClick={() => void handleExport()}>
                    Export current data first
                  </Button>
                  {exportError && (
                    <Typography role="alert" variant="body" tone="alert">
                      Export failed: {exportError}. Nothing was saved.
                    </Typography>
                  )}
                  <Typography as="label" variant="body" className="flex items-start gap-2">
                    <SquareCheckbox
                      id="replace-acknowledged"
                      checked={replaceAcknowledged}
                      onChange={() => {
                        setReplaceAcknowledged((previous) => !previous);
                      }}
                    />
                    I understand this will permanently erase all current data.
                  </Typography>
                </Surface>
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
            </Surface>
          )}
        </section>
      </div>
    </div>
  );
}
