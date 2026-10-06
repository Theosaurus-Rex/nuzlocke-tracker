import { readFile } from "node:fs/promises";

import { stubExternalNetwork } from "./support/pokeapi";
import { catchOnRoute, createRun, navFor } from "./support/flows";
import { expect, test } from "./support/test";

test("an exported run comes back whole in a fresh browser", async ({ page, browser }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Export and import run the same code at both widths, so one project covers it",
  );
  const nav = navFor(page, testInfo.project.name);

  await createRun(page, "Backup run");
  await catchOnRoute(page, "Route 29", "Clefairy");
  await catchOnRoute(page, "Route 46", "Pidgey");

  await nav.getByRole("link", { name: "Graveyard" }).click();
  await page.getByRole("button", { name: "Log a death" }).click();
  const deathDialog = page.getByRole("dialog");
  await deathDialog.getByRole("button", { name: "status", exact: true }).click();
  await deathDialog.getByRole("button", { name: "Send to graveyard" }).click();
  await expect(deathDialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: "Clefairy" })).toBeVisible();

  await nav.getByRole("link", { name: "Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;
  const exportPath = testInfo.outputPath("export.json");
  await download.saveAs(exportPath);
  expect((await readFile(exportPath, "utf8")).length).toBeGreaterThan(0);

  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const fresh = await context.newPage();
  const escaped = await stubExternalNetwork(fresh);

  await fresh.goto("/");
  await expect(fresh).toHaveURL(/\/runs\/new$/);
  await fresh.goto("/settings");
  await fresh.getByLabel("Backup file").setInputFiles(exportPath);
  await fresh.getByRole("button", { name: "Import", exact: true }).click();
  await expect(fresh.getByText(/Import complete/)).toBeVisible();

  await fresh.goto("/");
  await expect(fresh.getByRole("heading", { name: "Backup run" })).toBeVisible();
  await fresh.getByRole("link", { name: "Resume" }).click();
  await expect(fresh.getByRole("heading", { name: "Encounter routes" })).toBeVisible();

  const freshNav = navFor(fresh, testInfo.project.name);
  await freshNav.getByRole("link", { name: "Party" }).click();
  await expect(fresh.getByRole("heading", { level: 2, name: "Pidgey" })).toBeVisible();
  await freshNav.getByRole("link", { name: "Graveyard" }).click();
  await expect(fresh.getByRole("heading", { level: 2, name: "Clefairy" })).toBeVisible();

  expect(escaped, "requests that left the app unstubbed").toEqual([]);
  await context.close();
});
