import { useCallback, type ReactNode } from "react";

import { useAbilityIndex } from "@/game/pokeapi/queries";
import { abilityDisplayName, findByName, searchIndex } from "@/game/pokeapi/resolve";
import { joinIds } from "@/lib/utils";

import { ComboboxField } from "./combobox-field";
import { PokeApiNotice } from "./pokeapi-notice";

export interface AbilityPickerProps {
  id: string;
  value: string;
  onChange: (abilityId: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function AbilityPicker({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: AbilityPickerProps): ReactNode {
  const index = useAbilityIndex();
  const entries = index.data;
  const noticeId = `${id}-pokeapi-notice`;

  const resolve = useCallback(
    (text: string) =>
      entries === undefined ? "" : (findByName(entries, text, abilityDisplayName)?.name ?? ""),
    [entries],
  );
  const search = useCallback(
    (query: string) =>
      entries === undefined
        ? []
        : searchIndex(entries, query, abilityDisplayName).map((a) => ({
            id: a.name,
            label: abilityDisplayName(a.name),
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
      displayName={abilityDisplayName}
      search={search}
      notice={<PokeApiNotice id={noticeId} query={index} loadingText="Loading abilities…" />}
    />
  );
}
