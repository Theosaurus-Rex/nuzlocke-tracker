/** Device-local convenience, not run data, so it bypasses the storage adapter and the export. */

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
    return;
  }
}

function clearStoredRunId(): void {
  try {
    localStorage.removeItem(CURRENT_RUN_STORAGE_KEY);
  } catch {
    return;
  }
}

/** While `runs` is still loading, a remembered id is trusted rather than dropped, so a reload
 * doesn't flash "no current run" before settling back to the right one. */
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
