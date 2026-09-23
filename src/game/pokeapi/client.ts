export const POKEAPI_BASE = "https://pokeapi.co/api/v2";

export class PokeApiError extends Error {
  status: number | "network";

  constructor(status: number | "network", path: string) {
    super(`PokéAPI request for ${path} failed: ${String(status)}`);
    this.name = "PokeApiError";
    this.status = status;
  }
}

export async function fetchJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${POKEAPI_BASE}${path}`);
  } catch {
    throw new PokeApiError("network", path);
  }
  if (!response.ok) throw new PokeApiError(response.status, path);
  return (await response.json()) as T;
}
