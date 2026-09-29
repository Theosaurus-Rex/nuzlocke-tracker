import { useCallback, type ReactNode } from "react";

import { useMoveIndex } from "@/game/pokeapi/queries";
import { findByName, moveDisplayName, searchIndex } from "@/game/pokeapi/resolve";
import { joinIds } from "@/lib/utils";

import { ComboboxField } from "./combobox-field";
import { PokeApiNotice } from "./pokeapi-notice";

export interface MovePickerProps {
  id: string;
  value: string;
  onChange: (moveId: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function MovePicker({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MovePickerProps): ReactNode {
  const index = useMoveIndex();
  const entries = index.data;
  const noticeId = `${id}-pokeapi-notice`;

  const resolve = useCallback(
    (text: string) =>
      entries === undefined ? "" : (findByName(entries, text, moveDisplayName)?.name ?? ""),
    [entries],
  );
  const search = useCallback(
    (query: string) =>
      entries === undefined
        ? []
        : searchIndex(entries, query, moveDisplayName).map((m) => ({
            id: m.name,
            label: moveDisplayName(m.name),
          })),
    [entries],
  );

  return (
    <ComboboxField
      id={id}
      value={value}
      onChange={onChange}
      aria-invalid={ariaInvalid}
      aria-describedby={joinIds(ariaDescribedBy, noticeId)}
      resolve={resolve}
      displayName={moveDisplayName}
      search={search}
      notice={<PokeApiNotice id={noticeId} query={index} loadingText="Loading moves…" />}
    />
  );
}
