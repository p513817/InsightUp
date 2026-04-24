import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase",
  {
    variants: {
      variant: {
        default: "border-[rgba(121,215,195,0.32)] bg-[linear-gradient(180deg,rgba(233,250,246,0.96),rgba(220,243,237,0.92))] text-[#245a56]",
        neutral: "border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}