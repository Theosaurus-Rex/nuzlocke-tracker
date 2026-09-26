import type { ReactNode } from "react";

import { Typography } from "@/components/typography";

export interface PokeApiNoticeProps {
  id: string;
  query: { isPending: boolean; isFetching: boolean; isError: boolean; refetch: () => unknown };
  loadingText: string;
}

export function PokeApiNotice({ id, query, loadingText }: PokeApiNoticeProps): ReactNode {
  // A query that once held data stays isError during its retry, so isFetching must win the
  // check or a retry in progress looks identical to one that already failed again.
  if (query.isPending || query.isFetching) {
    return (
      <Typography as="p" id={id} role="status" variant="caption" tone="muted" className="mt-1">
        {loadingText}
      </Typography>
    );
  }
  if (query.isError) {
    return (
      <Typography as="p" id={id} role="alert" variant="caption" tone="alert" className="mt-1">
        Couldn't reach PokéAPI.{" "}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </Typography>
    );
  }
  return null;
}
