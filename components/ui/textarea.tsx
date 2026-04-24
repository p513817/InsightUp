import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-28 w-full rounded-[1.5rem] border border-border bg-white/74 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] outline-none transition placeholder:text-[#6f829a] focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";