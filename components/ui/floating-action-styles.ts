export const FAB_SIZE_CLASS = "size-14 sm:size-[3.75rem]";
export const ROUND_ACTION_FEEDBACK_CLASS = "transition-[transform,background-color,opacity,box-shadow] duration-200 active:scale-[0.92] active:rotate-6 active:brightness-95";
export const FAB_BASE_CLASS =
  `${FAB_SIZE_CLASS} shrink-0 overflow-hidden rounded-full p-0 [&_svg]:relative [&_svg]:z-10 [&_svg]:transition-transform [&_svg]:duration-200 active:[&_svg]:scale-110 active:[&_svg]:rotate-90 ${ROUND_ACTION_FEEDBACK_CLASS}`;
export const FAB_PRIMARY_TONE_CLASS =
  "shadow-[0_12px_28px_rgb(23_52_93/0.20)] hover:shadow-[0_16px_34px_rgb(23_52_93/0.24)]";
export const FAB_OUTLINE_TONE_CLASS =
  "border border-border/80 bg-card/92 text-muted-foreground shadow-[0_8px_18px_rgb(15_23_42/0.10)] backdrop-blur hover:bg-card hover:text-foreground hover:shadow-[0_10px_22px_rgb(15_23_42/0.13)]";
export const FAB_FIXED_POSITION_CLASS =
  "fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-[max(1.25rem,calc((100vw-30rem)/2+1.25rem))] z-40 sm:bottom-7 sm:right-[max(1.75rem,calc((100vw-30rem)/2+1.75rem))]";
export const FLOATING_ACTION_BAR_CLASS =
  "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-40 sm:bottom-7";
export const FLOATING_ACTION_BAR_INNER_CLASS =
  "mx-auto flex w-full max-w-[30rem] items-center justify-between gap-3 px-5 sm:px-7";
