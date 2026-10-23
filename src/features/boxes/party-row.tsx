import type { ReactNode } from "react";

import { Typography } from "@/components/typography";
import { MAX_PARTY_SIZE } from "@/domain/transitions";
import type { Mon } from "@/domain/types";

import { partyId } from "./drop-ids";
import { EmptySlot, FilledSlot } from "./slot-tiles";

export function PartyRow({
  bySlot,
  onEdit,
}: {
  bySlot: ReadonlyMap<number, Mon>;
  onEdit: (monId: string) => void;
}): ReactNode {
  return (
    <section aria-label="Party" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <Typography variant="eyebrow">Party</Typography>
        <Typography variant="number" tone="muted">
          {`${String(bySlot.size)} / ${String(MAX_PARTY_SIZE)}`}
        </Typography>
      </div>
      <ul aria-label="Party slots" className="grid grid-cols-6 gap-1 md:gap-3">
        {Array.from({ length: MAX_PARTY_SIZE }, (_, slot) => {
          const mon = bySlot.get(slot);
          return mon ? (
            <FilledSlot key={slot} mon={mon} dropId={partyId(slot)} compact onEdit={onEdit} />
          ) : (
            <EmptySlot key={slot} dropId={partyId(slot)} />
          );
        })}
      </ul>
    </section>
  );
}
