import type { ComponentPropsWithRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TypographyVariant =
  "heading" | "title" | "body" | "strong" | "caption" | "eyebrow" | "number";

export type TypographyTone = "ink" | "muted" | "alert";

type TypographyElement =
  "h1" | "h2" | "h3" | "p" | "span" | "label" | "legend" | "li" | "dt" | "dd";

const VARIANT_CLASS: Record<TypographyVariant, string> = {
  heading: "text-xl font-bold sm:text-2xl",
  title: "text-base font-bold",
  body: "text-sm",
  strong: "text-sm font-medium",
  caption: "text-xs",
  eyebrow: "text-[13px] leading-(--text-sm--line-height) font-medium tracking-[0.12em] uppercase",
  number: "font-mono",
};

const DEFAULT_ELEMENT: Record<TypographyVariant, TypographyElement> = {
  heading: "h1",
  title: "h2",
  body: "p",
  strong: "p",
  caption: "p",
  eyebrow: "span",
  number: "span",
};

const TONE_CLASS: Record<TypographyTone, string> = {
  ink: "text-foreground",
  muted: "text-muted-foreground",
  alert: "text-destructive",
};

export type TypographyProps<E extends TypographyElement = "span"> = {
  as?: E;
  variant: TypographyVariant;
  tone?: TypographyTone;
} & Omit<ComponentPropsWithRef<E>, "as">;

export function Typography<E extends TypographyElement = "span">({
  as,
  variant,
  tone = variant === "eyebrow" ? "muted" : undefined,
  className,
  ...rest
}: TypographyProps<E>): ReactNode {
  const Element = (as ?? DEFAULT_ELEMENT[variant]) as ElementType;
  // The variant goes last so a size passed in className cannot override it.
  const classes = cn(className, VARIANT_CLASS[variant], tone && TONE_CLASS[tone]);
  return <Element className={classes} {...rest} />;
}
