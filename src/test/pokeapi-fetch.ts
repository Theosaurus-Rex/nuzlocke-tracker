import { vi } from "vitest";

import { POKEAPI_BASE } from "@/game/pokeapi/client";

import {
  moveFixtures,
  moveIndexFixture,
  pokemonFixtures,
  speciesIndexFixture,
} from "./pokeapi-fixtures";

class StubStatus {
  status: number;
  constructor(status: number) {
    this.status = status;
  }
}

export function stubStatus(status: number): StubStatus {
  return new StubStatus(status);
}

export const STUB_NETWORK_ERROR = Symbol("network error");
export const STUB_PENDING = Symbol("pending");

export const defaultPokeApiRoutes: Record<string, unknown> = {
  "/pokemon?limit=100000": speciesIndexFixture,
  "/move?limit=100000": moveIndexFixture,
  ...Object.fromEntries(
    Object.entries(pokemonFixtures).map(([n, body]) => [`/pokemon/${n}`, body]),
  ),
  ...Object.fromEntries(Object.entries(moveFixtures).map(([n, body]) => [`/move/${n}`, body])),
};

export function stubPokeApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn((input: string | URL | Request): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const path = url.startsWith(POKEAPI_BASE) ? url.slice(POKEAPI_BASE.length) : url;
    const body = routes[path];
    if (body === undefined) return Promise.resolve(new Response(null, { status: 404 }));
    if (body === STUB_PENDING) return new Promise<Response>(() => undefined);
    if (body === STUB_NETWORK_ERROR) return Promise.reject(new TypeError("Failed to fetch"));
    if (body instanceof StubStatus)
      return Promise.resolve(new Response(null, { status: body.status }));
    return Promise.resolve(Response.json(body));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
