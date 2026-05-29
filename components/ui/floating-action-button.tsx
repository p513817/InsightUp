"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FAB_BASE_CLASS, FAB_FIXED_POSITION_CLASS, FAB_OUTLINE_TONE_CLASS, FAB_PRIMARY_TONE_CLASS } from "@/components/ui/floating-action-styles";

interface FloatingActionButtonProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  fixed?: boolean;
  onClick?: () => void;
  pulse?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
  variant?: "primary" | "outline";
}

export function FloatingActionButton({
  ariaLabel,
  children,
  className,
  disabled = false,
  fixed = true,
  onClick,
  pulse = true,
  title,
  type = "button",
  variant = "primary",
}: FloatingActionButtonProps) {
  const toneClassName = variant === "outline" ? FAB_OUTLINE_TONE_CLASS : FAB_PRIMARY_TONE_CLASS;

  const placementClassName = fixed ? FAB_FIXED_POSITION_CLASS : "";

  return (
    <Button
      aria-label={ariaLabel}
      className={`${pulse ? "ai-generate-pulse" : ""} pointer-events-auto cursor-pointer ${FAB_BASE_CLASS} ${toneClassName} ${placementClassName} ${className || ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </Button>
  );
}
