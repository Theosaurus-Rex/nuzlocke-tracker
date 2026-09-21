/**
 * Slices the hi-fi wireframe canvas export into one PNG per frame.
 *
 * Source: docs/wireframes/hifi/nuzlocke-tracker-wireframes.html, a self-unpacking bundle
 * exported from the Claude Design canvas. Its inline script decodes a base64 manifest on load
 * and replaces the document with the real page. Each frame is a `div.dv-opt` whose id is the
 * ticket-facing name ("5b", "6a").
 *
 * Requires a Playwright-managed Chromium (`pnpm exec playwright install chromium`).
 *
 *   node scripts/slice-hifi-wireframes.ts [path-to-html] [--force]
 *
 * Only the 23 hi-fi frames are cut. 1a, 1d and 2a-2h sit on the same canvas but were already
 * cut from the PDF at better fidelity by scripts/slice-wireframes.ts.
 *
 * A frame is clipped to the union of its direct children that are not themselves `.dv-opt`,
 * rather than to its own bounding box. This looks redundant, and for 22 frames it is. A missing
 * closing tag in the canvas markup leaves 5b holding 5c through 5i as real DOM children, so its
 * own box measures 942x5095 against its siblings' 942x629. Clipping by children excludes them
 * without hardcoding anything about 5b.
 *
 * The viewport is fixed at 1600 CSS px: narrower clips 3d, wider reflows the canvas into more
 * columns and shrinks the frames sharing a row.
 *
 * This is a one-shot bootstrapper, not part of the build. The PNGs it writes are committed and
 * are what the tickets point at. It refuses to overwrite a populated output directory unless
 * passed --force.
 */

/// <reference lib="dom" />
// The reference above is for the page.evaluate callback bodies only: those run in the
// browser, not this Node script, but tsconfig.node.json's lib list has no DOM to type them with.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML = path.join(REPO_ROOT, "docs/wireframes/hifi/nuzlocke-tracker-wireframes.html");
const OUT_DIR = path.join(REPO_ROOT, "docs/wireframes/hifi/frames");

const VIEWPORT = { width: 1600, height: 1550 };
const DEVICE_SCALE_FACTOR = 2;
const WAIT_TIMEOUT_MS = 30_000;

// prettier-ignore
const FRAME_IDS = [
  "3a", "3b", "3c", "3d", "4a",
  "5a", "5b", "5c", "5d", "5e", "5f", "5g", "5h", "5i",
  "6a", "6b", "6c", "6d", "6e", "6f", "6g", "6h", "6i",
];

interface ClipBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes("--force");
const htmlPath = path.resolve(rawArgs.find((arg) => arg !== "--force") ?? DEFAULT_HTML);

function refuseIfAlreadyPopulated(outDir: string, forceOverride: boolean) {
  if (forceOverride || !existsSync(outDir)) return;
  const existing = readdirSync(outDir).filter((name) => name.endsWith(".png"));
  if (existing.length === 0) return;
  console.error(
    `${outDir} already holds ${existing.length} frame PNGs. Pass --force to re-slice them.`,
  );
  process.exit(1);
}

function toFileUrl(file: string) {
  return "file://" + encodeURI(file).replace(/#/g, "%23");
}

async function main() {
  refuseIfAlreadyPopulated(OUT_DIR, force);
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  await page.goto(toFileUrl(htmlPath), { waitUntil: "load" });

  await page.waitForFunction(
    (ids) => ids.every((id) => document.querySelector(`[id="${id}"]`)),
    FRAME_IDS,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete), {
    timeout: WAIT_TIMEOUT_MS,
  });

  const written: string[] = [];
  for (const id of FRAME_IDS) {
    const clip: ClipBox = await page.evaluate((frameId) => {
      const el = document.querySelector(`[id="${frameId}"]`);
      if (!el) throw new Error(`frame ${frameId} not found`);
      const ownContent = Array.from(el.children).filter(
        (child) => !child.classList.contains("dv-opt"),
      );
      const top = Math.min(...ownContent.map((c) => c.getBoundingClientRect().top));
      window.scrollTo(0, top + window.scrollY);

      const rects = ownContent.map((c) => c.getBoundingClientRect());
      const x = Math.min(...rects.map((r) => r.left));
      const y = Math.min(...rects.map((r) => r.top));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      return { x, y, width: right - x, height: bottom - y };
    }, id);

    await page.screenshot({ path: path.join(OUT_DIR, `${id}.png`), clip });
    written.push(id);
  }

  await browser.close();
  console.log(`Wrote ${written.length} frames to ${OUT_DIR}: ${written.join(", ")}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
