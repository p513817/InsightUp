import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#1c365f_0%,#2b5388_100%)] px-5 text-primary-foreground shadow-[0_10px_20px_rgba(28,54,95,0.14)] hover:-translate-y-px hover:brightness-110",
        outline:
          "border border-border bg-white/70 px-5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:border-accent/60 hover:bg-[rgba(121,215,195,0.14)]",
        secondary:
          "bg-[linear-gradient(135deg,rgba(121,215,195,0.88),rgba(184,238,227,0.95))] px-5 text-[#10233f] hover:brightness-105",
        ghost: "px-3 text-muted-foreground hover:bg-[rgba(28,54,95,0.08)] hover:text-foreground",
        destructive:
          "bg-[linear-gradient(135deg,#b85b73_0%,#a34761_100%)] px-5 text-white shadow-[0_10px_18px_rgba(184,91,115,0.16)] hover:brightness-105",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6",
        icon: "size-11 rounded-full px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };