import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { MAX_MOVES } from "@/domain/transitions";
import type { MoveDef } from "@/game/data/pokedex/moves";
import { getMoveByName, moveDisplayName, searchMoves } from "@/game/pokedex";

import { ComboboxField } from "./combobox-field";

function toMoveId(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

function excludeChosen(defs: MoveDef[], chosen: readonly string[]): MoveDef[] {
  return defs.filter((m) => !chosen.includes(m.name));
}

export interface MovesetFieldProps {
  id: string;
  value: string[];
  onChange: (moves: string[]) => void;
}

export function MovesetField({ id, value, onChange }: MovesetFieldProps): ReactNode {
  function removeAt(index: number): void {
    onChange(value.filter((_, i) => i !== index));
  }

  function add(moveId: string): void {
    onChange([...value, moveId]);
  }

  const emptySlotCount = MAX_MOVES - value.length;

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">Moveset</span>
      <div className="grid grid-cols-2 gap-2">
        {value.map((moveId, index) => (
          <div
            key={moveId}
            className="flex h-8 items-center justify-between rounded-lg border border-border px-2.5 text-sm"
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
            onAdd={add}
          />
        ))}
      </div>
    </div>
  );
}

interface MoveSlotPickerProps {
  id: string;
  existing: readonly string[];
  onAdd: (moveId: string) => void;
}

function MoveSlotPicker({ id, existing, onAdd }: MoveSlotPickerProps): ReactNode {
  return (
    <ComboboxField
      id={id}
      value=""
      placeholder="+ move"
      onChange={(moveId) => {
        if (moveId !== "") onAdd(moveId);
      }}
      resolve={(text) => {
        const match = getMoveByName(toMoveId(text));
        return match === undefined || existing.includes(match.name) ? "" : match.name;
      }}
      displayName={moveDisplayName}
      search={(query) =>
        excludeChosen(searchMoves(query), existing).map((m) => ({
          id: m.name,
          label: moveDisplayName(m.name),
        }))
      }
    />
  );
}
