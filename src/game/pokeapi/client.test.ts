import { describe, expect, it } from "vitest";

import { STUB_NETWORK_ERROR, stubPokeApi, stubStatus } from "@/test/pokeapi-fetch";

import { fetchJson, PokeApiError } from "./client";

describe("fetchJson", () => {
  it("fetches a path under the PokéAPI base url", async () => {
    const fetchMock = stubPokeApi({ "/pokemon/pidgey": { id: 16 } });
    await expect(fetchJson("/pokemon/pidgey")).resolves.toEqual({ id: 16 });
    expect(fetchMock).toHaveBeenCalledWith("https://pokeapi.co/api/v2/pokemon/pidgey");
  });

  it("throws a PokeApiError carrying the status on a non-2xx response", async () => {
    stubPokeApi({ "/pokemon/pidgey": stubStatus(503) });
    const error = await fetchJson("/pokemon/pidgey").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PokeApiError);
    expect((error as PokeApiError).status).toBe(503);
  });

  it("reports a failed request as a network error", async () => {
    stubPokeApi({ "/pokemon/pidgey": STUB_NETWORK_ERROR });
    const error = await fetchJson("/pokemon/pidgey").catch((e: unknown) => e);
    expect((error as PokeApiError).status).toBe("network");
  });
});
