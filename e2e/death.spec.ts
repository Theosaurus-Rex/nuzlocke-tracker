import { catchOnRoute, createRun, navFor } from "./support/flows";
import { expect, test } from "./support/test";

test("a logged death reaches the graveyard and marks the route fainted", async ({
  page,
}, testInfo) => {
  const nav = navFor(page, testInfo.project.name);

  await createRun(page, "Death run");
  await catchOnRoute(page, "Route 29", "Clefairy");

  await nav.getByRole("link", { name: "Graveyard" }).click();
  await page.getByRole("button", { name: "Log a death" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "status", exact: true }).click();
  await dialog.getByRole("button", { name: "Send to graveyard" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole("heading", { level: 2, name: "Clefairy" })).toBeVisible();

  await nav.getByRole("link", { name: "Routes" }).click();
  const routeRow = page
    .getByRole("row")
    .or(page.getByRole("listitem"))
    .filter({ hasText: "Route 29" });
  await expect(routeRow.getByText("fainted", { exact: true })).toBeVisible();
});
