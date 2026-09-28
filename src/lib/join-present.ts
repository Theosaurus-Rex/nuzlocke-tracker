export function joinPresent(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null && part !== "").join(" · ");
}
