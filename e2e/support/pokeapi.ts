import type { Page } from "@playwright/test";

import { POKEAPI_BASE } from "../../src/game/pokeapi/client";
import {
  abilityIndexFixture,
  evolutionChainFixtures,
  itemIndexFixture,
  moveFixtures,
  moveIndexFixture,
  pokemonFixtures,
  pokemonSpeciesFixtures,
  speciesIndexFixture,
} from "../../src/test/pokeapi-fixtures";

const APP_HOSTS = new Set(["localhost", "127.0.0.1"]);

const routes: Record<string, unknown> = {
  "/pokemon?limit=100000": speciesIndexFixture,
  "/move?limit=100000": moveIndexFixture,
  "/ability?limit=100000": abilityIndexFixture,
  "/item?limit=100000": itemIndexFixture,
  ...Object.fromEntries(
    Object.entries(pokemonFixtures).map(([name, body]) => [`/pokemon/${name}`, body]),
  ),
  ...Object.fromEntries(
    Object.entries(moveFixtures).map(([name, body]) => [`/move/${name}`, body]),
  ),
  ...Object.fromEntries(
    Object.entries(pokemonSpeciesFixtures).map(([id, body]) => [`/pokemon-species/${id}`, body]),
  ),
  ...Object.fromEntries(
    Object.entries(evolutionChainFixtures).map(([id, body]) => [`/evolution-chain/${id}`, body]),
  ),
};

/** Answers PokéAPI from fixtures and returns every external request nothing was prepared for. */
export async function stubExternalNetwork(page: Page): Promise<string[]> {
  const escaped: string[] = [];

  await page.route(
    (url) => !APP_HOSTS.has(url.hostname),
    async (route) => {
      const url = new URL(route.request().url());
      if (route.request().resourceType() === "image") {
        await route.abort();
      } else if (route.request().url().startsWith(POKEAPI_BASE)) {
        const path = route.request().url().slice(POKEAPI_BASE.length);
        const body = routes[path];
        if (body === undefined) {
          await route.fulfill({ status: 404 });
        } else {
          await route.fulfill({ json: body });
        }
      } else {
        escaped.push(url.href);
        await route.abort();
      }
    },
  );

  return escaped;
}
