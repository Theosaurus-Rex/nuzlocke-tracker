import { expect, test } from "./support/test";

test("shows the sidebar on desktop and the tab bar on mobile", async ({ page }, testInfo) => {
  await page.goto("/");

  const sidebar = page.getByRole("navigation", { name: "Sidebar navigation" });
  const tabBar = page.getByRole("navigation", { name: "Tab bar navigation" });

  if (testInfo.project.name === "desktop") {
    await expect(sidebar).toBeVisible();
    await expect(tabBar).toBeHidden();
  } else {
    await expect(tabBar).toBeVisible();
    await expect(sidebar).toBeHidden();
  }
});

test("switches shells at the 768px breakpoint", async ({ page }) => {
  await page.goto("/");

  const sidebar = page.getByRole("navigation", { name: "Sidebar navigation" });
  const tabBar = page.getByRole("navigation", { name: "Tab bar navigation" });

  await page.setViewportSize({ width: 767, height: 800 });
  await expect(tabBar).toBeVisible();
  await expect(sidebar).toBeHidden();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(sidebar).toBeVisible();
  await expect(tabBar).toBeHidden();
});
