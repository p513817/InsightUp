import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-input bg-card/90 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";