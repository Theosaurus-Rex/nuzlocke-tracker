# Wireframes

Two canvases, both exported from the Claude Design project `52583f86-cc91-43e2-b2f3-b592e7fcec36`
("Nuzlocke Tracker Wireframes") and both also attached to the Linear project. The copies here are
the ones to read: the Linear attachments are served from signed URLs that expire minutes after
they are issued.

| Set | Source | Frames |
|---|---|---|
| **Hi-fi** | `hifi/nuzlocke-tracker-wireframes.html` | `hifi/frames/3a`–`3d`, `4a`, `5a`–`5i`, `6a`–`6i` |
| Lo-fi | `nuzlocke-tracker-wireframes.pdf` | `frames/1a`, `1d`, `1d-1`–`1d-9`, `2a`–`2h` |

**Build to the hi-fi frames.** They are the finished design, in the Block Shadow direction, and
where they disagree with the lo-fi set they win. The lo-fi set stays because the issues still
cite it and because `1d` carries the whole mobile flow in one image, which the hi-fi set does not
repeat.

The lo-fi frames' Patrick Hand / sketch-border styling was never a decision about visual
direction. The real one is Block Shadow, and `../design/block-shadow.md` holds the palette, the
type rules and the component shapes.

## Reading a frame

Every Linear issue names the frames it is drawn from, as
`**Wireframe:** 5h, 6d (hi-fi) · 2g, 1d-4 (lo-fi)`. Each is a PNG: hi-fi in `hifi/frames/`, lo-fi
in `frames/`. Open `hifi/frames/5h.png` and `hifi/frames/6d.png` directly. `all` means the frame
set as a whole and `—` means the issue has no drawn screen.

The PDF itself is one page 828pt wide and over 6000pt tall, with every frame stacked on it. Read
whole it scales down to an unreadable sliver, which is why the PNGs exist.

### Hi-fi frames

Desktop is 942×629 on the sidebar shell; mobile is 340×715.

| Frame | Screen |
|---|---|
| `3a` | Direction: DMG, Game Boy greyscale. Rejected |
| `3b` | Direction: Pixel Field, dusty blue on cream. Rejected |
| `3c` | Direction: **Block Shadow. Chosen.** Palette, type specimens, component chips |
| `3d` | Direction: Terminal, near-black with one electric accent. Rejected |
| `4a` | Party, box and detail cards in Block Shadow |
| `5a` | Desktop: encounter route table. The daily driver |
| `5b` | Desktop: party |
| `5c` | Desktop: boxes |
| `5d` | Desktop: graveyard |
| `5e` | Desktop: gyms and Elite Four |
| `5f` | Desktop: run list / home |
| `5g` | Desktop: new run setup |
| `5h` | Desktop: encounter detail, modal over routes |
| `5i` | Desktop: log a death, modal over graveyard |
| `6a` | Mobile: run list / home |
| `6b` | Mobile: new run setup |
| `6c` | Mobile: route encounter list |
| `6d` | Mobile: encounter detail, full-screen |
| `6e` | Mobile: party |
| `6f` | Mobile: boxes |
| `6g` | Mobile: graveyard |
| `6h` | Mobile: log a death, full-screen |
| `6i` | Mobile: gyms and Elite Four |

`3a`, `3b` and `3d` are kept only so the choice is legible. Do not build from them.

### Lo-fi frames

| Frame | Screen | Hi-fi |
|---|---|---|
| `1a` | Web: sidebar nav and main panel, showing the encounter route table | `5a` |
| `1d` | Mobile: the full flow, all nine screens in one grid | `6a`–`6i` |
| `1d-1` | Run list / home | `6a` |
| `1d-2` | New run setup | `6b` |
| `1d-3` | Route encounter list | `6c` |
| `1d-4` | Encounter detail, full-screen | `6d` |
| `1d-5` | Party | `6e` |
| `1d-6` | Boxes | `6f` |
| `1d-7` | Graveyard | `6g` |
| `1d-8` | Gyms and Elite Four | `6i` |
| `1d-9` | Log a death, full-screen | `6h` |
| `2a` | Run list / home | `5f` |
| `2b` | New run setup | `5g` |
| `2c` | Party | `5b` |
| `2d` | Boxes | `5c` |
| `2e` | Graveyard | `5d` |
| `2f` | Gyms and Elite Four | `5e` |
| `2g` | Encounter detail, modal over routes | `5h` |
| `2h` | Log a death, modal over graveyard | `5i` |

Section 1 is the route encounter list in both shells; section 2 is the desktop version of each
mobile screen, on the same sidebar shell as `1a`. There is no `1b` or `1c` in the export.

The run stats screen and distraction-free logging mode appear only as "try next" notes in the
footer of `2h`. Neither was ever drawn, and the hi-fi canvas did not add them.

## Re-slicing

Both slicers are one-shot tools, not part of the build. The PNGs they wrote are committed and are
what the issues point at, so run them again only after re-exporting a canvas. Both refuse to
overwrite a populated output directory unless passed `--force`.

**Hi-fi.** `scripts/slice-hifi-wireframes.ts` renders the HTML export in headless Chromium and
screenshots one element per frame into `hifi/frames/`.

```sh
pnpm exec playwright install chromium
node scripts/slice-hifi-wireframes.ts --force
```

The export is self-unpacking: its inline script decodes a base64 manifest and replaces the
document before any frame exists. The script cuts only the hi-fi frames, because `1a`, `1d` and
`2a`–`2h` are on the same canvas but already cut from the PDF at better fidelity.

**Lo-fi.** `scripts/slice-wireframes.ts` cuts the PDF into `frames/`.

```sh
brew install poppler                              # pdftotext and pdftoppm
node scripts/slice-wireframes.ts --force
```

It finds frame tops from the labels drawn in the canvas's left margin, so new or reordered frames
need no change. Frame `1d` is the exception: its nine mobile screens carry no labels, so the 3x3
grid is measured by hand in the script. Check `frames/1d-1.png` and `frames/1d-9.png` after any
re-export.
