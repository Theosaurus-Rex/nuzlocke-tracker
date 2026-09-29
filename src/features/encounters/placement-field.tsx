import type { ReactNode } from "react";

import { Typography } from "@/components/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Placement = "party" | "box";

const PLACEMENT_ITEMS = [
  { value: "party", label: "Party" },
  { value: "box", label: "Box" },
];

export interface PlacementFieldProps {
  id: string;
  value: Placement;
  onChange: (value: Placement) => void;
  partyFull?: boolean;
}

export function PlacementField({
  id,
  value,
  onChange,
  partyFull = false,
}: PlacementFieldProps): ReactNode {
  return (
    <div>
      <Typography as="label" variant="eyebrow" htmlFor={id} className="mb-1 block">
        Placement
      </Typography>
      <Select items={PLACEMENT_ITEMS} value={value} onValueChange={(next) => onChange(next!)}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-describedby={partyFull ? `${id}-note` : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="party" disabled={partyFull}>
            Party
          </SelectItem>
          <SelectItem value="box">Box</SelectItem>
        </SelectContent>
      </Select>
      {partyFull && (
        <Typography as="p" id={`${id}-note`} variant="caption" tone="muted" className="mt-1">
          Party is full
        </Typography>
      )}
    </div>
  );
}
