"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AddFriendDialogProps {
  open: boolean;
  onConfirm: (friendCode: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onConfirm, onOpenChange }: AddFriendDialogProps) {
  const [friendCode, setFriendCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelFeedbackVisible, setIsCancelFeedbackVisible] = useState(false);
  const [isSubmitFeedbackVisible, setIsSubmitFeedbackVisible] = useState(false);

  const sectionClassName =
    "surface-muted-gradient space-y-2 rounded-[1rem] border border-border/80 p-4";
  const sectionTitleClassName = "text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
  const controlClassName =
    "h-10 rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

  useEffect(() => {
    if (!open) {
      setFriendCode("");
      setIsSubmitting(false);
      setIsCancelFeedbackVisible(false);
      setIsSubmitFeedbackVisible(false);
    }
  }, [open]);

  function triggerFeedback(setter: React.Dispatch<React.SetStateAction<boolean>>) {
    setter(false);
    requestAnimationFrame(() => {
      setter(true);
    });
    window.setTimeout(() => {
      setter(false);
    }, 220);
  }

  function handleCancelClick() {
    triggerFeedback(setIsCancelFeedbackVisible);
    window.setTimeout(() => {
      onOpenChange(false);
    }, 120);
  }

  function handleSubmitPress() {
    triggerFeedback(setIsSubmitFeedbackVisible);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onConfirm(friendCode);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="h-[min(88vh,30rem)] max-w-4xl p-0 sm:h-[min(88vh,32rem)]"
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="px-5 py-4 sm:px-6">
          <DialogTitle>新增好友</DialogTitle>
          <DialogDescription>輸入對方在 Account 頁面看到的好友編號，系統會把對方最新的 InBody 快照加入你的列表。</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:px-6 sm:py-4">
            <section className={sectionClassName}>
              <p className={sectionTitleClassName}>好友連結</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="friend-code-input">
                  好友編號
                </label>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  className={controlClassName}
                  id="friend-code-input"
                  onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
                  placeholder="例如 4F7A91BC2D"
                  value={friendCode}
                />
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/96 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 sm:px-6">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button className="relative overflow-hidden" disabled={isSubmitting} onClick={handleCancelClick} type="button" variant="outline">
                <span
                  aria-hidden
                  className={isCancelFeedbackVisible ? "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-100 scale-100 transition duration-200" : "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-0 scale-[0.8] transition duration-200"}
                />
                <span className="relative z-10">取消</span>
              </Button>
              <Button className="relative overflow-hidden" disabled={isSubmitting || !friendCode.trim()} onClick={handleSubmitPress} type="submit">
                <span
                  aria-hidden
                  className={isSubmitFeedbackVisible ? "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-100 scale-100 transition duration-200" : "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-0 scale-[0.8] transition duration-200"}
                />
                <span className="relative z-10 inline-flex items-center gap-2">
                  {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  {isSubmitting ? "新增中..." : "新增好友"}
                </span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
