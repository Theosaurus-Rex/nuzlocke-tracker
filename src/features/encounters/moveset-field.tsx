import { XIcon } from "lucide-react";
import { useCallback, useRef, type ReactNode } from "react";

import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { MAX_MOVES } from "@/domain/transitions";
import type { IndexEntry } from "@/game/pokeapi/model";
import { useMoveIndex } from "@/game/pokeapi/queries";
import { findByName, moveDisplayName, searchIndex } from "@/game/pokeapi/resolve";

import { ComboboxField } from "./combobox-field";
import { PokeApiNotice } from "./pokeapi-notice";

function excludeChosen(entries: readonly IndexEntry[], chosen: readonly string[]): IndexEntry[] {
  return entries.filter((entry) => !chosen.includes(entry.name));
}

export interface MovesetFieldProps {
  id: string;
  value: string[];
  onChange: (moves: string[]) => void;
}

export function MovesetField({ id, value, onChange }: MovesetFieldProps): ReactNode {
  const moveIndex = useMoveIndex();
  const noticeId = `${id}-pokeapi-notice`;

  // Two slots can resolve in the same commit when the move index arrives. This ref, kept
  // current by add/removeAt alone, stops both from building on the same stale `value`.
  const latestValue = useRef(value);

  function removeAt(index: number): void {
    const next = latestValue.current.filter((_, i) => i !== index);
    latestValue.current = next;
    onChange(next);
  }

  function add(moveId: string): void {
    if (latestValue.current.includes(moveId)) return;
    const next = [...latestValue.current, moveId];
    latestValue.current = next;
    onChange(next);
  }

  const emptySlotCount = MAX_MOVES - value.length;

  return (
    <div>
      <Typography as="span" variant="eyebrow" className="mb-1 block">
        Moveset
      </Typography>
      <div className="grid grid-cols-2 gap-2">
        {value.map((moveId, index) => (
          <div
            key={moveId}
            className="flex h-8 items-center justify-between border-[1.5px] border-border px-2.5 text-sm"
          >
            <span>{moveDisplayName(moveId)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${moveDisplayName(moveId)}`}
              onClick={() => removeAt(index)}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        {Array.from({ length: emptySlotCount }, (_, i) => value.length + i).map((slotIndex) => (
          <MoveSlotPicker
            key={slotIndex}
            id={`${id}-${String(slotIndex)}`}
            existing={value}
            entries={moveIndex.data}
            onAdd={add}
            describedBy={noticeId}
          />
        ))}
      </div>
      {emptySlotCount > 0 && (
        <PokeApiNotice id={noticeId} query={moveIndex} loadingText="Loading moves…" />
      )}
    </div>
  );
}

interface MoveSlotPickerProps {
  id: string;
  existing: readonly string[];
  entries: readonly IndexEntry[] | undefined;
  onAdd: (moveId: string) => void;
  describedBy: string;
}

function MoveSlotPicker({
  id,
  existing,
  entries,
  onAdd,
  describedBy,
}: MoveSlotPickerProps): ReactNode {
  const resolve = useCallback(
    (text: string) => {
      if (entries === undefined) return "";
      const match = findByName(entries, text);
      return match === undefined || existing.includes(match.name) ? "" : match.name;
    },
    [entries, existing],
  );
  const search = useCallback(
    (query: string) =>
      entries === undefined
        ? []
        : excludeChosen(searchIndex(entries, query), existing).map((m) => ({
            id: m.name,
            label: moveDisplayName(m.name),
          })),
    [entries, existing],
  );

  return (
    <ComboboxField
      id={id}
      value=""
      placeholder="+ move"
      inputClassName="border-dashed border-placeholder placeholder:text-muted-foreground"
      aria-describedby={describedBy}
      onChange={(moveId) => {
        if (moveId !== "") onAdd(moveId);
      }}
      resolve={resolve}
      displayName={moveDisplayName}
      search={search}
    />
  );
}
