/**
 * Slices docs/wireframes/nuzlocke-tracker-wireframes.pdf (a single page over 6000pt tall)
 * into one PNG per frame. One-shot bootstrapper: see README.md "Wireframes" for usage.
 * Requires poppler on PATH (`brew install poppler`) for pdftotext and pdftoppm.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PDF = path.join(REPO_ROOT, "docs/wireframes/nuzlocke-tracker-wireframes.pdf");
const OUT_DIR = path.join(REPO_ROOT, "docs/wireframes/frames");

const RESOLUTION = 150;
const LEFT_MARGIN_X = 45;
const LABEL_HEADROOM = 3;
const FRAME_GUTTER = 8;

// 1d holds nine mobile screens in a 3x3 grid, numbered 1d-1 to 1d-9 in reading order, so it's
// measured rather than read from a label. Specific to this export: re-check against a rendered
// 1d.png if the canvas is ever re-exported.
const MOBILE_FLOW_FRAME = "1d";
const MOBILE_FLOW_GRID = {
  columns: 3,
  rows: 3,
  x: 28,
  columnPitch: 255,
  width: 252,
  y: 14,
  rowPitch: 489.5,
  height: 485,
};

interface Frame {
  label: string;
  top: number;
  height: number;
}

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes("--force");
const pdfPath = path.resolve(rawArgs.find((arg) => arg !== "--force") ?? DEFAULT_PDF);

function refuseIfAlreadyPopulated(outDir: string, forceOverride: boolean) {
  if (forceOverride || !existsSync(outDir)) return;
  const existing = readdirSync(outDir).filter((name) => name.endsWith(".png"));
  if (existing.length === 0) return;
  console.error(
    `${outDir} already holds ${existing.length} frame PNGs. Pass --force to re-slice them.`,
  );
  process.exit(1);
}

// Frame tops are read from the labels the canvas draws in its left margin, so adding or
// reordering frames upstream needs no change here.
function readLayout(file: string) {
  const xml = execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8" });

  const page = /<page width="([\d.]+)" height="([\d.]+)"/.exec(xml);
  if (!page) throw new Error("no page dimensions in pdftotext output");

  const labels: { label: string; top: number }[] = [];
  const word = /<word xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([^<]+)<\/word>/g;
  for (const match of xml.matchAll(word)) {
    const [, xMin, yMin, text] = match;
    // The canvas draws section headers ("1", "2") in the same margin as frame labels. They are
    // dividers, not screens, so they bound the frame above without being sliced themselves.
    if (Number(xMin) > LEFT_MARGIN_X || !/^[12][a-h]?$/.test(text)) continue;
    labels.push({ label: text, top: Number(yMin) });
  }
  labels.sort((a, b) => a.top - b.top);

  const pageHeight = Number(page[2]);
  const frames: Frame[] = labels.flatMap(({ label, top }, index) => {
    if (label.length === 1) return [];
    const bottom = labels[index + 1]?.top ?? pageHeight;
    return [{ label, top, height: bottom - top - FRAME_GUTTER }];
  });

  return { pageWidth: Number(page[1]), frames };
}

function crop(file: string, name: string, box: { x: number; y: number; w: number; h: number }) {
  const px = (points: number) => Math.round((points * RESOLUTION) / 72);
  execFileSync("pdftoppm", [
    "-png",
    "-r",
    String(RESOLUTION),
    "-x",
    String(px(box.x)),
    "-y",
    String(px(box.y)),
    "-W",
    String(px(box.w)),
    "-H",
    String(px(box.h)),
    "-singlefile",
    file,
    path.join(OUT_DIR, name),
  ]);
}

function main() {
  refuseIfAlreadyPopulated(OUT_DIR, force);
  mkdirSync(OUT_DIR, { recursive: true });

  const { pageWidth, frames } = readLayout(pdfPath);
  if (frames.length === 0) throw new Error(`no frame labels found in ${pdfPath}`);

  const written: string[] = [];
  for (const { label, top, height } of frames) {
    crop(pdfPath, label, { x: 0, y: top - LABEL_HEADROOM, w: pageWidth, h: height });
    written.push(label);

    if (label !== MOBILE_FLOW_FRAME) continue;
    const g = MOBILE_FLOW_GRID;
    for (let row = 0; row < g.rows; row += 1) {
      for (let column = 0; column < g.columns; column += 1) {
        const screen = row * g.columns + column + 1;
        crop(pdfPath, `${label}-${screen}`, {
          x: g.x + g.columnPitch * column,
          y: top + g.y + g.rowPitch * row,
          w: g.width,
          h: g.height,
        });
        written.push(`${label}-${screen}`);
      }
    }
  }

  console.log(`Wrote ${written.length} frames to ${OUT_DIR}: ${written.join(", ")}`);
}

main();
