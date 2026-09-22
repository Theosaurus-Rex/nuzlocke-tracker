import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A square, hairline-bordered checkbox with a visible tick, per the Block Shadow direction.
 * Still a native `<input type="checkbox">`, so it keeps its role, name and keyboard behaviour. */
export function SquareCheckbox({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}): ReactNode {
  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center border-[1.5px] border-border bg-background",
        disabled && "opacity-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="absolute inset-0 size-full cursor-pointer appearance-none disabled:cursor-not-allowed"
      />
      {checked && (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none size-3">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      )}
    </span>
  );
}
