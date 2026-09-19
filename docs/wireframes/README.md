# Wireframes

`nuzlocke-tracker-wireframes.pdf` is the lo-fi wireframe canvas, exported from the Claude Design
project `52583f86-cc91-43e2-b2f3-b592e7fcec36` ("Nuzlocke Tracker Wireframes") and also attached
to the Linear project as the document **Lo-Fi Wireframe Exports**. The copy here is the one to
read: the Linear attachment is served from a signed URL that expires minutes after it is issued.

These are **wireframes, not a design system**. The Patrick Hand / sketch-border styling is not a
decision about visual direction.

## Reading a frame

Every Linear issue names the frames it is drawn from, as `**Wireframe:** 2b, 1d-2`. Each of those
is a PNG in `frames/`, so open `frames/2b.png` and `frames/1d-2.png` directly. `all` means the
frame set as a whole and `—` means the issue has no drawn screen.

The PDF itself is one page 828pt wide and over 6000pt tall, with every frame stacked on it. Read
whole it scales down to an unreadable sliver, which is why the PNGs exist.

| Frame | Screen |
|---|---|
| `1a` | Web: sidebar nav and main panel, showing the encounter route table |
| `1d` | Mobile: the full flow, all nine screens in one grid |
| `1d-1` | Run list / home |
| `1d-2` | New run setup |
| `1d-3` | Route encounter list |
| `1d-4` | Encounter detail, full-screen |
| `1d-5` | Party |
| `1d-6` | Boxes |
| `1d-7` | Graveyard |
| `1d-8` | Gyms and Elite Four |
| `1d-9` | Log a death, full-screen |
| `2a` | Run list / home |
| `2b` | New run setup |
| `2c` | Party |
| `2d` | Boxes |
| `2e` | Graveyard |
| `2f` | Gyms and Elite Four |
| `2g` | Encounter detail, modal over routes |
| `2h` | Log a death, modal over graveyard |

Section 1 is the route encounter list in both shells; section 2 is the desktop version of each
mobile screen, on the same sidebar shell as `1a`. There is no `1b` or `1c` in the export.

The run stats screen and distraction-free logging mode appear only as "try next" notes in the
footer of `2h`. Neither was ever drawn.

## Re-slicing

`scripts/slice-wireframes.ts` cuts the PDF into `frames/`. It is a one-shot tool, not part of the
build, and the PNGs it wrote are committed. Run it again only after re-exporting the canvas:

```sh
brew install poppler                              # pdftotext and pdftoppm
node scripts/slice-wireframes.ts --force
```

It finds frame tops from the labels drawn in the canvas's left margin, so new or reordered frames
need no change. Frame `1d` is the exception: its nine mobile screens carry no labels, so the 3x3
grid is measured by hand in the script. Check `frames/1d-1.png` and `frames/1d-9.png` after any
re-export.
