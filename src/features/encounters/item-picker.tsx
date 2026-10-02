import { useCallback, type ReactNode } from "react";

import { ItemSprite } from "@/components/item-sprite";
import { useItemIndex } from "@/game/pokeapi/queries";
import { itemDisplayName, findByName, searchIndex } from "@/game/pokeapi/resolve";
import { joinIds } from "@/lib/utils";

import { ComboboxField } from "./combobox-field";
import { PokeApiNotice } from "./pokeapi-notice";

export interface ItemPickerProps {
  id: string;
  value: string;
  onChange: (itemId: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function ItemPicker({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ItemPickerProps): ReactNode {
  const index = useItemIndex();
  const entries = index.data;
  const noticeId = `${id}-pokeapi-notice`;

  const resolve = useCallback(
    (text: string) =>
      entries === undefined ? "" : (findByName(entries, text, itemDisplayName)?.name ?? ""),
    [entries],
  );
  const search = useCallback(
    (query: string) =>
      entries === undefined
        ? []
        : searchIndex(entries, query, itemDisplayName).map((item) => ({
            id: item.name,
            label: itemDisplayName(item.name),
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
      displayName={itemDisplayName}
      search={search}
      icon={(itemId) => <ItemSprite item={itemId} />}
      notice={<PokeApiNotice id={noticeId} query={index} loadingText="Loading items…" />}
    />
  );
}
