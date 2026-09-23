import type { ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { getSpeciesByName, searchSpecies, speciesDisplayName } from "@/game/pokedex";

import { ComboboxField } from "./combobox-field";

function toSpeciesId(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Text only becomes a value once it names a real species, so typing something the pokedex does
 * not know leaves the field unset rather than logging a species that does not exist. Typing a
 * full name counts as choosing it, so the keyboard path needs no click.
 */
function resolveSpeciesId(text: string): string {
  return getSpeciesByName(toSpeciesId(text))?.name ?? "";
}

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
  return (
    <ComboboxField
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      resolve={resolveSpeciesId}
      displayName={speciesDisplayName}
      suffix={
        generation === undefined || value === "" ? undefined : (
          <SpeciesTypeBadge speciesId={value} generation={generation} />
        )
      }
      search={(query) =>
        searchSpecies(query).map((s) => ({ id: s.name, label: speciesDisplayName(s.name) }))
      }
    />
  );
}
