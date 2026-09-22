/**
 * The one chip shape. Status chips and type badges only differ in fill. Size is in px, not rem,
 * since chip text sits below the type scale and must not grow with it. `gap-1` matters because
 * a flex container drops whitespace between children, which would merge "12" and "caught".
 */
export const CHIP_SHAPE =
  "inline-flex items-center gap-1 border-[1.5px] border-border px-[7px] py-[3px] text-[11px] font-medium uppercase tracking-[0.12em]";
