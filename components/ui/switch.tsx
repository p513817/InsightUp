"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[1.625rem] w-11 shrink-0 cursor-pointer items-center rounded-full border border-border/70 bg-[linear-gradient(180deg,#edf3f8_0%,#e2ebf3_100%)] transition data-[state=checked]:border-[rgba(121,215,195,0.42)] data-[state=checked]:bg-[linear-gradient(180deg,rgba(185,239,228,0.95),rgba(121,215,195,0.92))] data-[state=unchecked]:bg-[linear-gradient(180deg,#edf3f8_0%,#e2ebf3_100%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block size-[1.125rem] translate-x-1 rounded-full bg-white shadow-[0_3px_10px_rgba(16,35,63,0.14)] transition-transform data-[state=checked]:translate-x-5" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;