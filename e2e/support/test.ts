import { expect, test as base } from "@playwright/test";

import { stubExternalNetwork } from "./pokeapi";

export const test = base.extend<{ stubbedNetwork: undefined }>({
  stubbedNetwork: [
    async ({ page }, use) => {
      const escaped = await stubExternalNetwork(page);
      await use(undefined);
      expect(escaped, "requests that left the app unstubbed").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
