import { expect, test } from "./support/test";

test("a caught encounter shows up in the party", async ({ page }, testInfo) => {
  const nav = page.getByRole("navigation", {
    name: testInfo.project.name === "desktop" ? "Sidebar navigation" : "Tab bar navigation",
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/runs\/new$/);

  await page.getByLabel("Run name").fill("E2E run");
  await page.getByRole("button", { name: "Start run" }).click();

  await expect(page.getByRole("heading", { name: "Encounter routes" })).toBeVisible();
  await page.getByRole("button", { name: "Log Route 29" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Species", { exact: true }).fill("Clefairy");
  await dialog.getByLabel("Level caught").fill("5");
  await dialog.getByRole("button", { name: "Save encounter" }).click();
  await expect(dialog).toBeHidden();

  await nav.getByRole("link", { name: "Party" }).click();

  await expect(page.getByRole("heading", { name: "Party" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Clefairy" })).toBeVisible();
});
