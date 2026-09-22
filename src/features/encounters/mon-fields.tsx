import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gender } from "@/domain/types";
import { getAllNatures } from "@/game/pokedex";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "genderless", label: "Genderless" },
];

/** The small uppercase tracked eyebrow every field label uses, per the Block Shadow direction. */
export const FIELD_LABEL_CLASS =
  "mb-1 block text-[13px] font-medium tracking-[0.12em] text-muted-foreground uppercase";

export interface NicknameFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  error?: string;
}

export function NicknameField({
  id,
  value,
  onChange,
  required,
  error,
}: NicknameFieldProps): ReactNode {
  const errorId = `${id}-error`;

  return (
    <div>
      <Label htmlFor={id} className={FIELD_LABEL_CLASS}>
        Nickname{required && <span aria-hidden="true"> *</span>}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export interface GenderFieldProps {
  value: Gender | null;
  onChange: (value: Gender | null) => void;
}

export function GenderField({ value, onChange }: GenderFieldProps): ReactNode {
  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>Gender</span>
      <div role="radiogroup" aria-label="Gender" className="flex gap-2">
        {GENDERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "secondary" : "outline"}
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(value === option.value ? null : option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export interface NatureFieldProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function NatureField({ id, value, onChange }: NatureFieldProps): ReactNode {
  return (
    <div>
      <Label htmlFor={id} className={FIELD_LABEL_CLASS}>
        Nature
      </Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select a nature" />
        </SelectTrigger>
        <SelectContent>
          {getAllNatures().map((option) => (
            <SelectItem key={option.name} value={option.name}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface AbilityFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AbilityField({ id, value, onChange, error }: AbilityFieldProps): ReactNode {
  const errorId = `${id}-error`;
  const errorProps =
    error !== undefined ? { "aria-invalid": true, "aria-describedby": errorId } : {};

  return (
    <div>
      <Label htmlFor={id} className={FIELD_LABEL_CLASS}>
        Ability
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...errorProps}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export interface HeldItemFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function HeldItemField({ id, value, onChange, error }: HeldItemFieldProps): ReactNode {
  const errorId = `${id}-error`;
  const errorProps =
    error !== undefined ? { "aria-invalid": true, "aria-describedby": errorId } : {};

  return (
    <div>
      <Label htmlFor={id} className={FIELD_LABEL_CLASS}>
        Held item
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...errorProps}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
