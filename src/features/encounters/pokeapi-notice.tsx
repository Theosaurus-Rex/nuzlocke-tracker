import type { ReactNode } from "react";

export interface PokeApiNoticeProps {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  loadingText: string;
}

export function PokeApiNotice({ query, loadingText }: PokeApiNoticeProps): ReactNode {
  if (query.isPending) {
    return (
      <p role="status" className="mt-1 text-xs text-muted-foreground">
        {loadingText}
      </p>
    );
  }
  if (query.isError) {
    return (
      <p role="alert" className="mt-1 text-xs text-destructive">
        Couldn't reach PokéAPI.{" "}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }
  return null;
}
