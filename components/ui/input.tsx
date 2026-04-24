import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-border bg-white/74 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] outline-none transition placeholder:text-[#6f829a] focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";