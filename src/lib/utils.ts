export { cn } from "cn";

export function joinIds(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter((id): id is string => id !== undefined).join(" ");
  return joined === "" ? undefined : joined;
}
