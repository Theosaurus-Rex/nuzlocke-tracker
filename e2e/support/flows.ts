import { expect, type Page } from "@playwright/test";
import { stubExternalNetwork } from "./pokeapi";

export async function createRun(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/runs\/new$/);
  await page.getByLabel("Run name").fill(name);
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.getByRole("heading", { name: "Encounter routes" })).toBeVisible();
}

export async function catchOnRoute(
  page: Page,
  route: string,
  species: string,
  placement: "Party" | "Box" = "Party",
): Promise<void> {
  await page.getByRole("button", { name: `Log ${route}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Species", { exact: true }).fill(species);
  await dialog.getByLabel("Level caught").fill("5");
  if (placement === "Box") {
    await dialog.getByRole("combobox", { name: "Placement" }).click();
    await page.getByRole("option", { name: "Box" }).click();
  }
  await dialog.getByRole("button", { name: "Save encounter" }).click();
  await expect(dialog).toBeHidden();
}

export function navFor(page: Page, projectName: string) {
  return page.getByRole("navigation", {
    name: projectName === "desktop" ? "Sidebar navigation" : "Tab bar navigation",
  });
}

/** Checks in a second tab, so the write is read back from storage and the first tab's cache can't answer. */
export async function expectPersisted(
  page: Page,
  check: (fresh: Page) => Promise<void>,
): Promise<void> {
  const fresh = await page.context().newPage();
  const escaped = await stubExternalNetwork(fresh);
  await fresh.goto(page.url());
  await expect(async () => {
    await fresh.reload();
    await check(fresh);
  }).toPass();
  await fresh.close();
  expect(escaped, "requests that left the app unstubbed").toEqual([]);
}
