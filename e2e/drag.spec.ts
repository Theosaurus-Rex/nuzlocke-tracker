import { catchOnRoute, createRun, expectPersisted, navFor } from "./support/flows";
import { expect, test } from "./support/test";

import type { Locator, Page } from "@playwright/test";

async function dragBetween(page: Page, from: Locator, to: Locator): Promise<void> {
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("drag target is not on screen");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2 + 12, {
    steps: 4,
  });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 15 });
  await page.mouse.up();
}

test("dragging a party card reorders the party and the order survives a reload", async ({
  page,
}, testInfo) => {
  const nav = navFor(page, testInfo.project.name);

  await createRun(page, "Drag run");
  await catchOnRoute(page, "Route 29", "Clefairy");
  await catchOnRoute(page, "Route 46", "Pidgey");
  await nav.getByRole("link", { name: "Party" }).click();

  const names = page.getByRole("heading", { level: 2 });
  await expect(names).toHaveText(["Clefairy", "Pidgey"]);

  await dragBetween(
    page,
    page.getByRole("heading", { name: "Clefairy" }),
    page.getByRole("heading", { name: "Pidgey" }),
  );
  await expect(names).toHaveText(["Pidgey", "Clefairy"]);

  await expectPersisted(page, (fresh) =>
    expect(fresh.getByRole("heading", { level: 2 })).toHaveText(["Pidgey", "Clefairy"]),
  );
});

test("dragging a boxed mon onto another swaps them and the swap survives a reload", async ({
  page,
}, testInfo) => {
  const nav = navFor(page, testInfo.project.name);

  await createRun(page, "Box drag run");
  await catchOnRoute(page, "Route 29", "Clefairy", "Box");
  await catchOnRoute(page, "Route 46", "Pidgey", "Box");
  await nav.getByRole("link", { name: "Boxes" }).click();

  const mons = page.getByRole("button", { name: /^Edit / });
  const order = () => mons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  await expect.poll(order).toEqual(["Edit Clefairy", "Edit Pidgey"]);

  await dragBetween(
    page,
    page.getByRole("button", { name: "Edit Clefairy" }),
    page.getByRole("button", { name: "Edit Pidgey" }),
  );
  await expect.poll(order).toEqual(["Edit Pidgey", "Edit Clefairy"]);

  await expectPersisted(page, async (fresh) => {
    const labels = await fresh
      .getByRole("button", { name: /^Edit / })
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(labels).toEqual(["Edit Pidgey", "Edit Clefairy"]);
  });
});
