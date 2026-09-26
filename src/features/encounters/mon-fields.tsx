import { StarIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/typography";
import type { Gender } from "@/domain/types";
import { natures } from "@/game/natures";
import { cn } from "@/lib/utils";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "genderless", label: "Genderless" },
];

/** The small uppercase tracked eyebrow shared by every field label. */
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
      <Typography as="label" variant="eyebrow" htmlFor={id} className="mb-1 block">
        Nickname{required && <span aria-hidden="true"> *</span>}
      </Typography>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <Typography as="p" id={errorId} variant="body" tone="alert" className="mt-1">
          {error}
        </Typography>
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
      <Typography as="span" variant="eyebrow" className="mb-1 block">
        Gender
      </Typography>
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

export interface ShinyFieldProps {
  id: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A square toggle button rather than a checkbox, matching the star drawn in the frames. */
export function ShinyField({ id, value, onChange }: ShinyFieldProps): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <Typography as="label" variant="eyebrow" tone="ink" htmlFor={id}>
        Shiny
      </Typography>
      <button
        id={id}
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={cn(
          "flex size-8 items-center justify-center border-[1.5px] border-border bg-background",
          value && "bg-flag",
        )}
      >
        <StarIcon aria-hidden="true" className={cn("size-4", value && "fill-current")} />
      </button>
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
      <Typography as="label" variant="eyebrow" htmlFor={id} className="mb-1 block">
        Nature
      </Typography>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select a nature" />
        </SelectTrigger>
        <SelectContent>
          {natures.map((option) => (
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
      <Typography as="label" variant="eyebrow" htmlFor={id} className="mb-1 block">
        Ability
      </Typography>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...errorProps}
      />
      {error && (
        <Typography as="p" id={errorId} variant="body" tone="alert" className="mt-1">
          {error}
        </Typography>
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
      <Typography as="label" variant="eyebrow" htmlFor={id} className="mb-1 block">
        Held item
      </Typography>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...errorProps}
      />
      {error && (
        <Typography as="p" id={errorId} variant="body" tone="alert" className="mt-1">
          {error}
        </Typography>
      )}
    </div>
  );
}
