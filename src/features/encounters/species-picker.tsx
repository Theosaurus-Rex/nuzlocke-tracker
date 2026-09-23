import { useCallback, type ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { useSpeciesIndex } from "@/game/pokeapi/queries";
import { findByName, searchIndex, speciesDisplayName } from "@/game/pokeapi/resolve";
import { joinIds } from "@/lib/utils";

import { ComboboxField } from "./combobox-field";
import { PokeApiNotice } from "./pokeapi-notice";

export interface SpeciesPickerProps {
  id: string;
  value: string;
  onChange: (speciesId: string) => void;
  /** Resolves the inline type badge once a species matches. Omitted, no badge shows. */
  generation?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
}

export function SpeciesPicker({
  id,
  value,
  onChange,
  generation,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SpeciesPickerProps): ReactNode {
  const index = useSpeciesIndex();
  const entries = index.data;
  const noticeId = `${id}-pokeapi-notice`;

  /**
   * Text only becomes a value once it names a real species, so typing something the index does
   * not know leaves the field unset rather than logging a species that does not exist. Typing a
   * full name counts as choosing it, so the keyboard path needs no click.
   */
  const resolve = useCallback(
    (text: string) => (entries === undefined ? "" : (findByName(entries, text)?.name ?? "")),
    [entries],
  );
  const search = useCallback(
    (query: string) =>
      entries === undefined
        ? []
        : searchIndex(entries, query).map((s) => ({
            id: s.name,
            label: speciesDisplayName(s.name),
          })),
    [entries],
  );

  return (
    <ComboboxField
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      aria-describedby={joinIds(ariaDescribedBy, noticeId)}
      resolve={resolve}
      displayName={speciesDisplayName}
      suffix={
        generation === undefined || value === "" ? undefined : (
          <SpeciesTypeBadge speciesId={value} generation={generation} />
        )
      }
      search={search}
      notice={<PokeApiNotice id={noticeId} query={index} loadingText="Loading Pokémon…" />}
    />
  );
}
