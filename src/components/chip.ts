/**
 * The one chip shape. Status chips and type badges differ only in their fill.
 *
 * `gap-1` stands in for the space between a chip's parts. A flex container drops whitespace
 * between its items, so "12 caught" written as a mono count beside a label renders as "12caught"
 * without it. A chip with one child is unaffected.
 */
export const CHIP_SHAPE =
  "inline-flex items-center gap-1 border-[1.5px] border-border px-[7px] py-[3px] text-[9px] font-medium uppercase tracking-[0.12em]";
