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

  useEffect(() => {
    if (!open) {
      setFriendCode("");
      setIsSubmitting(false);
    }
  }, [open]);

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
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5">
          <DialogTitle>新增好友</DialogTitle>
          <DialogDescription>輸入對方在 Account 頁面看到的 Friend ID，系統會把對方最新的 InBody 快照加入你的列表。</DialogDescription>
        </DialogHeader>

        <form className="space-y-4 px-5 py-4 sm:px-6 sm:py-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="friend-code-input">
              Friend ID
            </label>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="h-11"
              id="friend-code-input"
              onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
              placeholder="例如 4F7A91BC2D"
              value={friendCode}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting || !friendCode.trim()} type="submit">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              確定
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}