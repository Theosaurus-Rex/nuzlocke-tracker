import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

/** `/runs/:runId` has no content of its own — it always redirects to the routes tab. */
export function RunRedirect(): ReactNode {
  const { runId } = useParams<{ runId: string }>();

  // Route pattern guarantees `runId` is present; this is only a defensive fallback for the type.
  if (!runId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/runs/${runId}/routes`} replace />;
}
