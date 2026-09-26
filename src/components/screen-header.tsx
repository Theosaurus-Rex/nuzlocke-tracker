import type { ReactNode } from "react";

import { Typography } from "@/components/typography";

export interface ScreenHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function ScreenHeader({ title, actions, children }: ScreenHeaderProps): ReactNode {
  return (
    <div className="border-b-[1.5px] border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography as="h1" variant="heading">
          {title}
        </Typography>
        {actions}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
