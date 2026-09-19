import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { searchSpecies, speciesDisplayName } from "@/game/pokedex";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

function toSpeciesId(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

export interface SpeciesPickerProps {
  id: string;
  value: string;
  onChange: (speciesId: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
}

export function SpeciesPicker({
  id,
  value,
  onChange,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SpeciesPickerProps): ReactNode {
  const [query, setQuery] = useState(value === "" ? "" : speciesDisplayName(value));
  const [isOpen, setIsOpen] = useState(false);

  const results = query.trim() === "" ? [] : searchSpecies(query).slice(0, MAX_RESULTS);
  const showResults = isOpen && results.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={showResults}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={(event) => {
          const text = event.target.value;
          setQuery(text);
          setIsOpen(true);
          onChange(toSpeciesId(text));
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      />
      {showResults && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
        >
          {results.map((species) => (
            <li key={species.id}>
              <button
                type="button"
                role="option"
                aria-selected={toSpeciesId(query) === species.name}
                className={cn(
                  "block w-full px-2.5 py-1 text-left hover:bg-muted",
                  toSpeciesId(query) === species.name && "bg-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(speciesDisplayName(species.name));
                  setIsOpen(false);
                  onChange(species.name);
                }}
              >
                {speciesDisplayName(species.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
