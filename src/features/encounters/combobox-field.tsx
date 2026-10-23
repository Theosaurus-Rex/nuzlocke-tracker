import { useState, type ReactNode } from "react";

import { Autocomplete } from "@base-ui/react/autocomplete";

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
  /** Called after an option is picked from the list, but not when a value commits on blur. */
  onPick?: (id: string) => void;
  search: (query: string) => ComboboxItem[];
  resolve: (text: string) => string;
  displayName: (id: string) => string;
  placeholder?: string;
  /** Rendered inside the field, right-aligned, once a value resolves. Purely decorative. */
  suffix?: ReactNode;
  /** Rendered before the label in each option. */
  icon?: (id: string) => ReactNode;
  /** Rendered under the input, outside the popup, which is hidden while it has no items. */
  notice?: ReactNode;
  inputClassName?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const INPUT_CLASS = cn(
  "h-8 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-transparent px-2.5 py-1 text-base",
  "transition-colors outline-none placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  "md:text-sm",
);

/**
 * Type-to-filter input behind every picker. Typing only filters. A value is set by picking an
 * option, or by leaving the field with an exact name typed. See docs/notes/features.md#combobox-field.
 */
export function ComboboxField({
  id,
  value,
  onChange,
  onPick,
  search,
  resolve,
  displayName,
  placeholder,
  suffix,
  icon,
  notice,
  inputClassName,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ComboboxFieldProps): ReactNode {
  const [query, setQuery] = useState(value === "" ? "" : displayName(value));
  const [open, setOpen] = useState(false);
  const results = query.trim() === "" ? [] : search(query).slice(0, MAX_RESULTS);

  function handleTyping(text: string): void {
    setQuery(text);
    if (value !== "") onChange("");
  }

  function commitOnBlur(): void {
    const resolved = resolve(query);
    if (resolved !== "" && resolved !== value) onChange(resolved);
  }

  function select(item: ComboboxItem): void {
    setQuery(item.label);
    onChange(item.id);
    onPick?.(item.id);
    setOpen(false);
  }

  return (
    <Autocomplete.Root
      items={results}
      filter={null}
      value={query}
      open={open && results.length > 0}
      onOpenChange={setOpen}
      onValueChange={(text, eventDetails) => {
        if (eventDetails.reason === "item-press") return;
        handleTyping(text);
      }}
      itemToStringValue={(item: ComboboxItem) => item.label}
      openOnInputClick
    >
      <div className="relative">
        <Autocomplete.Input
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          onBlur={commitOnBlur}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(INPUT_CLASS, suffix && "pr-16", inputClassName)}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
            {suffix}
          </div>
        )}
      </div>
      {notice}
      <Autocomplete.Portal>
        <Autocomplete.Positioner className="z-50 outline-none" sideOffset={4} align="start">
          <Autocomplete.Popup className="w-(--anchor-width) max-w-(--available-width) border-[1.5px] border-border bg-popover py-1 text-sm shadow-block data-empty:hidden">
            <Autocomplete.List>
              {(item: ComboboxItem) => (
                <Autocomplete.Item
                  key={item.id}
                  value={item}
                  onClick={() => select(item)}
                  className={cn(
                    "px-2.5 py-1 outline-none data-highlighted:bg-muted",
                    icon && "flex items-center gap-2",
                    value === item.id && "font-medium",
                  )}
                >
                  {icon?.(item.id)}
                  {item.label}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
