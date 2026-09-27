import type { Gender } from "@/domain/types";

export function genderSymbol(gender: Gender | null): string | null {
  if (gender === "male") return "♂";
  if (gender === "female") return "♀";
  return null;
}
