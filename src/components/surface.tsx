import type { ComponentPropsWithRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SurfaceElement = "div" | "section" | "li";

const TONE_CLASS = {
  card: "border-[1.5px] border-border bg-card shadow-block",
  alert: "border-[1.5px] border-destructive bg-destructive/10 shadow-block-alert",
};

export type SurfaceProps<E extends SurfaceElement = "div"> = {
  as?: E;
  tone?: keyof typeof TONE_CLASS;
} & Omit<ComponentPropsWithRef<E>, "as">;

export function Surface<E extends SurfaceElement = "div">({
  as,
  tone = "card",
  className,
  ...rest
}: SurfaceProps<E>): ReactNode {
  const Element = (as ?? "div") as ElementType;
  return <Element className={cn(className, TONE_CLASS[tone])} {...rest} />;
}
