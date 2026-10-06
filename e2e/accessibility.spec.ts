import { expectNoSeriousA11yIssues } from "./support/axe";
import { catchOnRoute, createRun, navFor } from "./support/flows";
import { expect, test } from "./support/test";

import type { Page } from "@playwright/test";

async function scanScreen(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yIssues(page, { label: heading });
}

async function scanDialog(page: Page, label: string): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yIssues(page, { scope: '[role="dialog"]', label });
}

async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("the first-time empty state has no serious accessibility issues", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/runs\/new$/);
  await scanScreen(page, "New run");
});

test("the not-found page has no serious accessibility issues", async ({ page }) => {
  await page.goto("/no-such-page");
  await scanScreen(page, "Not Found");
});

test("every screen and dialog of a populated run has no serious accessibility issues", async ({
  page,
}, testInfo) => {
  const nav = navFor(page, testInfo.project.name);

  await createRun(page, "Access run");
  await catchOnRoute(page, "Route 29", "Clefairy");
  await catchOnRoute(page, "Route 46", "Pidgey");
  await catchOnRoute(page, "Route 30", "Geodude", "Box");

  await nav.getByRole("link", { name: "Graveyard" }).click();
  await page.getByRole("button", { name: "Log a death" }).click();
  const deathDialog = page.getByRole("dialog");
  await scanDialog(page, "Log a death dialog");
  await deathDialog.getByRole("button", { name: "status", exact: true }).click();
  await deathDialog.getByRole("button", { name: "Send to graveyard" }).click();
  await expect(deathDialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: "Clefairy" })).toBeVisible();
  await scanScreen(page, "Graveyard");

  await nav.getByRole("link", { name: "Routes" }).click();
  await scanScreen(page, "Encounter routes");
  await page.getByRole("button", { name: "Log Route 31" }).click();
  await scanDialog(page, "Log encounter dialog");
  await closeDialog(page);

  await nav.getByRole("link", { name: "Party" }).click();
  await scanScreen(page, "Party");
  await page
    .getByRole("button", { name: /^Edit / })
    .first()
    .click();
  await scanDialog(page, "Edit mon dialog");
  await closeDialog(page);

  await nav.getByRole("link", { name: "Boxes" }).click();
  await scanScreen(page, "Boxes");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await scanScreen(page, "Boxes");
  await page.getByRole("button", { name: "Grid", exact: true }).click();

  await nav.getByRole("link", { name: "Gyms & E4" }).click();
  await scanScreen(page, "Gyms & Elite Four");
  await page
    .getByRole("button", { name: /^Log attempt at / })
    .first()
    .click();
  await scanDialog(page, "Log fight attempt dialog");
  await closeDialog(page);
  await page.getByRole("button", { name: "Add fight" }).click();
  await scanDialog(page, "Add custom fight dialog");
  await closeDialog(page);

  await page.goto("/settings");
  await scanScreen(page, "Settings");

  await page.goto("/");
  await scanScreen(page, "Runs");

  await page.goto("/runs/new");
  await scanScreen(page, "New run");
});
