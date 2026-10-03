import type { ReactNode } from "react";

import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import { LevelInput } from "@/components/level-input";
import type { DeathField } from "@/domain/death-validation";
import { MovePicker } from "@/features/encounters/move-picker";
import { SpeciesPicker } from "@/features/encounters/species-picker";

function FieldError({ id, message }: { id: string; message: string | undefined }): ReactNode {
  return message === undefined ? null : (
    <Typography as="p" id={id} variant="body" tone="alert" className="mt-1">
      {message}
    </Typography>
  );
}

export interface AttackerFieldsProps {
  idPrefix: string;
  generation: number;
  speciesId: string;
  levelText: string;
  move: string;
  errors: Partial<Record<DeathField, string>>;
  onSpeciesChange: (speciesId: string) => void;
  onLevelChange: (levelText: string) => void;
  onMoveChange: (move: string) => void;
}

export function AttackerFields({
  idPrefix,
  generation,
  speciesId,
  levelText,
  move,
  errors,
  onSpeciesChange,
  onLevelChange,
  onMoveChange,
}: AttackerFieldsProps): ReactNode {
  return (
    <div className="flex items-start gap-3 border-[1.5px] border-border p-3">
      <SpeciesSprite speciesId={speciesId === "" ? null : speciesId} shiny={false} size={48} />
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_5rem_1fr]">
        <div>
          <Typography
            as="label"
            variant="caption"
            tone="muted"
            htmlFor={`${idPrefix}-species`}
            className="mb-1 block"
          >
            Species
          </Typography>
          <SpeciesPicker
            id={`${idPrefix}-species`}
            value={speciesId}
            onChange={onSpeciesChange}
            generation={generation}
            aria-invalid={errors.speciesId !== undefined}
            aria-describedby={errors.speciesId ? `${idPrefix}-species-error` : undefined}
          />
          <FieldError id={`${idPrefix}-species-error`} message={errors.speciesId} />
        </div>
        <div>
          <Typography
            as="label"
            variant="caption"
            tone="muted"
            htmlFor={`${idPrefix}-level`}
            className="mb-1 block"
          >
            Level
          </Typography>
          <LevelInput
            id={`${idPrefix}-level`}
            className="font-mono"
            value={levelText}
            onValueChange={onLevelChange}
            aria-invalid={errors.level !== undefined}
            aria-describedby={errors.level ? `${idPrefix}-level-error` : undefined}
          />
          <FieldError id={`${idPrefix}-level-error`} message={errors.level} />
        </div>
        <div>
          <Typography
            as="label"
            variant="caption"
            tone="muted"
            htmlFor={`${idPrefix}-move`}
            className="mb-1 block"
          >
            Move (optional)
          </Typography>
          <MovePicker id={`${idPrefix}-move`} value={move} onChange={onMoveChange} />
        </div>
      </div>
    </div>
  );
}
