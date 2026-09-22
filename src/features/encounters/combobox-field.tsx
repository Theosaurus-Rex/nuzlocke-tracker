import { useState, type KeyboardEvent, type ReactNode } from "react";

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
  /** Rendered inside the field, right-aligned, once a value resolves. Purely decorative. */
  suffix?: ReactNode;
  inputClassName?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Type-to-filter input backing both the species and move pickers. Text only becomes a value once
 * it resolves to a real option, so typing something `resolve` does not know leaves the value
 * unset rather than committing raw text. Typing a full name counts as choosing it, so the
 * keyboard path needs no click.
 *
 * Arrows move through the options and wrap, Enter takes the active one, Escape closes. Focus
 * stays in the input and `aria-activedescendant` follows the active option, so the options are
 * plain list items rather than focusable buttons. Enter falls through untouched when no option
 * is active, which is what keeps Enter submitting the form from any field.
 */
export function ComboboxField({
  id,
  value,
  onChange,
  search,
  resolve,
  displayName,
  placeholder,
  suffix,
  inputClassName,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ComboboxFieldProps): ReactNode {
  const [query, setQuery] = useState(value === "" ? "" : displayName(value));
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const results = query.trim() === "" ? [] : search(query).slice(0, MAX_RESULTS);
  const showResults = isOpen && results.length > 0;
  const listboxId = `${id}-listbox`;
  const activeItem = activeIndex === null ? undefined : results[activeIndex];

  function close(): void {
    setIsOpen(false);
    setActiveIndex(null);
  }

  function select(item: ComboboxItem): void {
    setQuery(item.label);
    close();
    onChange(item.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      if (results.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev === null ? 0 : (prev + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) =>
        prev === null ? results.length - 1 : (prev - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter") {
      if (activeItem === undefined) return;
      event.preventDefault();
      select(activeItem);
    } else if (event.key === "Escape") {
      close();
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={showResults}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeItem === undefined ? undefined : `${id}-option-${activeItem.id}`
        }
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(suffix && "pr-16", inputClassName)}
        onChange={(event) => {
          const text = event.target.value;
          setQuery(text);
          setIsOpen(true);
          setActiveIndex(null);
          onChange(resolve(text));
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={close}
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
          {suffix}
        </div>
      )}
      {showResults && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 w-full border-[1.5px] border-border bg-popover py-1 text-sm shadow-block"
        >
          {results.map((item, index) => (
            <li
              key={item.id}
              id={`${id}-option-${item.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "px-2.5 py-1 hover:bg-muted",
                index === activeIndex && "bg-muted",
                value === item.id && "font-medium",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(item)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
