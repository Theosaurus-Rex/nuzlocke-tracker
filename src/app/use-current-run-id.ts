/**
 * The current run outlives the URL: it's a device-local convenience, not run data, so it's kept
 * in localStorage rather than behind the storage adapter and never touches the export bundle.
 */

import { useEffect } from "react";
import { useParams } from "react-router";

import type { Run } from "@/domain/types";

export const CURRENT_RUN_STORAGE_KEY = "nuzlocke.currentRunId";

function readStoredRunId(): string | undefined {
  try {
    return localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStoredRunId(runId: string): void {
  try {
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, runId);
  } catch {
    // Storage unavailable. The run stays current for this render, just not remembered.
  }
}

function clearStoredRunId(): void {
  try {
    localStorage.removeItem(CURRENT_RUN_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage already threw.
  }
}

/** `undefined` runs means the run list hasn't loaded yet, in which case a remembered id is
 * trusted rather than dropped, to avoid a flash of "no current run" on every reload. Storage
 * itself holds the remembered id, not component state: the URL is the only input that should
 * cause a render here, so writing and clearing storage are both plain effects, with nothing to
 * set afterwards. */
export function useCurrentRunId(runs: readonly Run[] | undefined): string | undefined {
  const { runId: urlRunId } = useParams<{ runId: string }>();
  const rememberedId = urlRunId ?? readStoredRunId();

  const rememberedExists =
    rememberedId === undefined || runs === undefined
      ? true
      : runs.some((run) => run.id === rememberedId);

  useEffect(() => {
    if (urlRunId !== undefined) {
      writeStoredRunId(urlRunId);
    }
  }, [urlRunId]);

  useEffect(() => {
    if (
      urlRunId === undefined &&
      rememberedId !== undefined &&
      runs !== undefined &&
      !rememberedExists
    ) {
      clearStoredRunId();
    }
  }, [urlRunId, rememberedId, runs, rememberedExists]);

  if (urlRunId !== undefined) {
    return urlRunId;
  }
  return rememberedExists ? rememberedId : undefined;
}
