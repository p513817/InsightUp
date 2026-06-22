"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";

interface AddFriendDialogProps {
  open: boolean;
  onConfirm: (friendCode: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onConfirm, onOpenChange }: AddFriendDialogProps) {
  const t = useTranslations();
  const [friendCode, setFriendCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFriendCode("");
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      <DialogContent className="h-[min(88vh,30rem)] max-w-[30rem] p-0 sm:h-[min(88vh,32rem)]" onInteractOutside={(event) => event.preventDefault()} showCloseButton={false}>
        <DialogHeader className="px-5 py-4 sm:px-6">
          <DialogTitle>{t("friends.add")}</DialogTitle>
          <DialogDescription>{t("friends.myFriendCodeHint")}</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:px-6 sm:py-4">
            <section className="surface-muted-gradient space-y-2 rounded-[1rem] border border-border/80 p-4">
              <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("friends.friendCode")}</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="friend-code-input">
                  {t("friends.friendCode")}
                </label>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-10 rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
                  id="friend-code-input"
                  onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
                  placeholder="4F7A91BC2D"
                  value={friendCode}
                />
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/96 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 sm:px-6">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button className="relative overflow-hidden" disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
                <span>{t("common.cancel")}</span>
              </Button>
              <Button className="relative overflow-hidden" disabled={isSubmitting || !friendCode.trim()} type="submit">
                <span className="relative z-10 inline-flex items-center gap-2">
                  {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  {isSubmitting ? t("common.loading") : t("friends.add")}
                </span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
