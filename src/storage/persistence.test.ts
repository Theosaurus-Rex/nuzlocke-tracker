/**
 * Covers the feature-detection that keeps `requestPersistentStorage()` from crashing startup in
 * a real browser lacking `navigator.storage` (jsdom, and older Safari) — see CLAUDE.md hard rule
 * 5. Each test restores the original `navigator.storage` descriptor so mocking one case can't
 * leak into another.
 */

import { afterEach, describe, expect, it } from "vitest";

import { requestPersistentStorage, resetPersistenceStatusForTests } from "./persistence";

const originalStorage = Object.getOwnPropertyDescriptor(navigator, "storage");

afterEach(() => {
  resetPersistenceStatusForTests();
  if (originalStorage) {
    Object.defineProperty(navigator, "storage", originalStorage);
  } else {
    Reflect.deleteProperty(navigator, "storage");
  }
});

function stubNavigatorStorage(value: unknown): void {
  Object.defineProperty(navigator, "storage", {
    value,
    configurable: true,
  });
}

describe("requestPersistentStorage", () => {
  it("returns unsupported when navigator.storage is absent (jsdom's real, unmocked state)", async () => {
    Reflect.deleteProperty(navigator, "storage");

    await expect(requestPersistentStorage()).resolves.toBe("unsupported");
  });

  it("returns unsupported when navigator.storage.persist is missing", async () => {
    stubNavigatorStorage({});

    await expect(requestPersistentStorage()).resolves.toBe("unsupported");
  });

  it("returns granted when persist() resolves true", async () => {
    stubNavigatorStorage({ persist: () => Promise.resolve(true) });

    await expect(requestPersistentStorage()).resolves.toBe("granted");
  });

  it("returns denied when persist() resolves false", async () => {
    stubNavigatorStorage({ persist: () => Promise.resolve(false) });

    await expect(requestPersistentStorage()).resolves.toBe("denied");
  });

  it("returns unsupported when persist() rejects", async () => {
    stubNavigatorStorage({ persist: () => Promise.reject(new Error("blocked")) });

    await expect(requestPersistentStorage()).resolves.toBe("unsupported");
  });
});
