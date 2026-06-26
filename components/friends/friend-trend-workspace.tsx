"use client";

import { useState } from "react";
import { Columns2, Eye, EyeOff, RectangleHorizontal, TrendingUp } from "lucide-react";
import { MiniTrendGrid, type TrendGridLayout } from "@/components/charts/mini-trend-grid";
import { CopyFriendCodeButton } from "@/components/friends/copy-friend-code-button";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { BottomActionDock } from "@/components/ui/bottom-action-dock";
import type { FriendSnapshot } from "@/lib/friends/types";
import type { ChartPayload } from "@/lib/inbody/types";
import { formatLongDate, getUserInitials } from "@/lib/presentation";

type FriendTrendWorkspaceProps = {
  chart: ChartPayload;
  friend: FriendSnapshot;
};

export function FriendTrendWorkspace({ chart, friend }: FriendTrendWorkspaceProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [trendLayout, setTrendLayout] = useState<TrendGridLayout>("one");
  const [trendEditMode, setTrendEditMode] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);

  function cycleTrendLayout() {
    setTrendLayout((current) => (current === "two" ? "one" : "two"));
  }

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-28">
      <Card className="gap-3 rounded-[1.35rem] p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={friend.displayName} className="size-12 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14" src={friend.avatarUrl} />
          ) : (
            <div className="surface-avatar-fallback flex size-12 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14">
              {getUserInitials(friend.displayName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[1.55rem] leading-none text-foreground sm:text-2xl">{friend.displayName}</h1>
            <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] font-semibold leading-none text-[rgb(var(--primary-strong))]">
              <span className="shrink-0 whitespace-nowrap">{friend.latestRecordedAt ? formatLongDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-border" />
              <span className="inline-flex min-w-0 items-center gap-0.5 text-primary">
                <span className="truncate leading-none">{friend.friendCode}</span>
                <CopyFriendCodeButton displayName={friend.displayName} friendCode={friend.friendCode} />
              </span>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <MiniTrendGrid
          chart={chart}
          editMode={trendEditMode}
          layout={trendLayout}
          showTrendLine={showTrendLine}
          storageScope={`friend.${friend.friendUserId}`}
        />
      </section>

      <BottomActionDock
        items={[
          {
            active: trendLayout === "two",
            ariaLabel: t("dashboardTrendUi.layout"),
            icon: trendLayout === "two" ? <Columns2 className="size-4" /> : <RectangleHorizontal className="size-4" />,
            label: t("dashboardTrendUi.layout"),
            onClick: cycleTrendLayout,
            title: t("dashboardTrendUi.layout"),
          },
          {
            active: trendEditMode,
            ariaLabel: t("dashboardTrendUi.visibility"),
            icon: trendEditMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
            label: t("dashboardTrendUi.visibility"),
            onClick: () => setTrendEditMode((current) => !current),
            title: t("dashboardTrendUi.visibility"),
          },
          {
            active: showTrendLine,
            ariaLabel: t("dashboardTrendUi.trendLine"),
            icon: <TrendingUp className="size-4" />,
            label: t("dashboardTrendUi.trendLine"),
            onClick: () => setShowTrendLine((current) => !current),
            title: t("dashboardTrendUi.trendLine"),
          },
        ]}
      />
    </div>
  );
}
