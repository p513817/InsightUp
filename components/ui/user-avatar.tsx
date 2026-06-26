"use client";

import { useEffect, useState } from "react";
import { getUserInitials } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  name: string;
  title?: string;
}

export function UserAvatar({
  avatarUrl,
  className,
  fallbackClassName,
  imageClassName,
  loading = "lazy",
  name,
  title,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowImage = Boolean(avatarUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div className={className} title={title}>
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          className={cn("size-full object-cover", imageClassName)}
          loading={loading}
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
          src={avatarUrl ?? undefined}
        />
      ) : (
        <span aria-hidden="true" className={fallbackClassName}>
          {getUserInitials(name)}
        </span>
      )}
    </div>
  );
}
