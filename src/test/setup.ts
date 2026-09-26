import "@testing-library/jest-dom/vitest";

import { beforeEach } from "vitest";

import { defaultPokeApiRoutes, stubPokeApi } from "./pokeapi-fetch";

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
  localStorage.clear();
});
