import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

export interface ComboboxItem {
  id: string;
  label: string;
}

export interface ComboboxFieldProps {
  id: string;
  value: string;
  onChange: (id: string) => void;
  search: (query: string) => ComboboxItem[];
  resolve: (text: string) => string;
  displayName: (id: string) => string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Type-to-filter input backing both the species and move pickers. Text only becomes a value once
 * it resolves to a real option, so typing something `resolve` does not know leaves the value
 * unset rather than committing raw text. Typing a full name counts as choosing it, so the
 * keyboard path needs no click.
 */
export function ComboboxField({
  id,
  value,
  onChange,
  search,
  resolve,
  displayName,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ComboboxFieldProps): ReactNode {
  const [query, setQuery] = useState(value === "" ? "" : displayName(value));
  const [isOpen, setIsOpen] = useState(false);

  const results = query.trim() === "" ? [] : search(query).slice(0, MAX_RESULTS);
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
          onChange(resolve(text));
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      />
      {showResults && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover py-1 text-sm shadow-md"
        >
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === item.id}
                className={cn(
                  "block w-full px-2.5 py-1 text-left hover:bg-muted",
                  value === item.id && "bg-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(item.label);
                  setIsOpen(false);
                  onChange(item.id);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
