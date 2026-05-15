import * as React from "react";

import { cn } from "@/lib/shared/utils";

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
