import { lazy, Suspense, type ReactNode } from "react";

import { ScreenErrorBoundary } from "@/app/screen-error-boundary";
import { Typography } from "@/components/typography";

export const LogEncounterDialog = lazy(() =>
  import("@/features/encounters/log-encounter-dialog").then((m) => ({
    default: m.LogEncounterDialog,
  })),
);
export const EditMonDialog = lazy(() =>
  import("@/features/encounters/edit-mon-dialog").then((m) => ({ default: m.EditMonDialog })),
);
export const ResetEncounterDialog = lazy(() =>
  import("./reset-encounter-dialog").then((m) => ({ default: m.ResetEncounterDialog })),
);

export function DialogLoader({ children }: { children: ReactNode }): ReactNode {
  return (
    <ScreenErrorBoundary>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
            <Typography
              role="status"
              variant="body"
              className="border-[1.5px] border-border bg-popover px-4 py-3 shadow-block-modal"
            >
              Loading…
            </Typography>
          </div>
        }
      >
        {children}
      </Suspense>
    </ScreenErrorBoundary>
  );
}
