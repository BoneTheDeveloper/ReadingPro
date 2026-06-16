import * as React from "react";

import { cn } from "@/shared/utils";

/**
 * Provides a lightweight scrollable container that preserves the shared UI
 * component API while applying the app's overflow styling.
 */
function ScrollArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("overflow-y-auto", className)}
      {...props}
    />
  );
}

export { ScrollArea };
