import type { ReactNode } from "react";

import { Typography } from "@/components/typography";

export function NotFoundScreen(): ReactNode {
  return (
    <Typography as="h1" variant="heading" className="p-4">
      Not Found
    </Typography>
  );
}
