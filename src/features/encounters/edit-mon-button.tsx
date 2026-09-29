import type { ReactNode } from "react";

import type { Mon } from "@/domain/types";

import { monTitle } from "./mon-title";

export function EditMonButton({ mon, onEdit }: { mon: Mon; onEdit: () => void }): ReactNode {
  return (
    <button
      type="button"
      aria-label={`Edit ${monTitle(mon)}`}
      onClick={onEdit}
      className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
