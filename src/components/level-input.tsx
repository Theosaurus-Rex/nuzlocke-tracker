import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type LevelInputProps = Omit<ComponentProps<typeof Input>, "onChange" | "type"> & {
  onValueChange: (value: string) => void;
};

export function LevelInput({ onValueChange, ...props }: LevelInputProps) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      maxLength={3}
      {...props}
      onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ""))}
    />
  );
}
