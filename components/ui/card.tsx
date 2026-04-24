import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-panel transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-[1px] hover:border-accent/45",
        className,
      )}
      {...props}
    />
  );
}