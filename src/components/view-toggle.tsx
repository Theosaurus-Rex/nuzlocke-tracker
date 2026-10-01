import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ViewToggleProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ViewToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: ViewToggleProps<T>): ReactNode {
  return (
    <div role="group" aria-label={label} className={cn("flex items-center gap-3", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer border-[1.5px] px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-border bg-flag shadow-block"
                : "border-muted bg-background hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
