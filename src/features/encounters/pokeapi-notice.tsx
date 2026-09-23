import type { ReactNode } from "react";

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
      <p id={id} role="status" className="mt-1 text-xs text-muted-foreground">
        {loadingText}
      </p>
    );
  }
  if (query.isError) {
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-destructive">
        Couldn't reach PokéAPI.{" "}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }
  return null;
}
