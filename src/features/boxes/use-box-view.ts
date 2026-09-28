import { useState } from "react";

export type BoxView = "grid" | "list";

export const BOX_VIEW_STORAGE_KEY = "nuzlocke.boxView";

function readStoredView(): BoxView {
  try {
    const stored = localStorage.getItem(BOX_VIEW_STORAGE_KEY);
    return stored === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function writeStoredView(view: BoxView): void {
  try {
    localStorage.setItem(BOX_VIEW_STORAGE_KEY, view);
  } catch {
    return;
  }
}

export function useBoxView(): [BoxView, (view: BoxView) => void] {
  const [view, setView] = useState<BoxView>(readStoredView);

  function updateView(next: BoxView): void {
    setView(next);
    writeStoredView(next);
  }

  return [view, updateView];
}
