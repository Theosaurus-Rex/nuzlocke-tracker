import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);
const TARGETS_SHOWN = 3;

export async function expectNoSeriousA11yIssues(
  page: Page,
  options: { scope?: string; label?: string } = {},
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (options.scope) builder = builder.include(options.scope);

  const { violations } = await builder.analyze();
  const blocking = violations.filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact));

  const report = blocking.map((v) => {
    const targets = v.nodes
      .slice(0, TARGETS_SHOWN)
      .map((node) => `    ${node.target.join(" ")}  ${node.html.slice(0, 120)}`)
      .join("\n");
    const more =
      v.nodes.length > TARGETS_SHOWN
        ? `\n    ...and ${String(v.nodes.length - TARGETS_SHOWN)} more`
        : "";
    return `${v.id} (${String(v.impact)}): ${v.help}\n${targets}${more}`;
  });

  expect(
    report,
    `${options.label ?? page.url()} has serious accessibility issues:\n${report.join("\n")}`,
  ).toEqual([]);
}
