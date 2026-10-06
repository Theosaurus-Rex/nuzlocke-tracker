import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/typography";

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4">
        <Typography variant="body">
          This screen could not load. The app may have been updated. Reload to get the latest
          version.
        </Typography>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    );
  }
}
