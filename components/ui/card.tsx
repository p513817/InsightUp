import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-panel", className)} {...props} />;
}