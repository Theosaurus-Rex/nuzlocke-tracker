import { useRememberedChoice } from "@/lib/use-remembered-choice";

export type BoxView = "grid" | "list";

export const BOX_VIEW_STORAGE_KEY = "nuzlocke.boxView";

const BOX_VIEWS: readonly BoxView[] = ["grid", "list"];

export function useBoxView(): [BoxView, (view: BoxView) => void] {
  return useRememberedChoice(BOX_VIEW_STORAGE_KEY, BOX_VIEWS, "grid");
}
