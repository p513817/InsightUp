"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, Eye, EyeOff } from "lucide-react";
import { FriendCompareGrid, type FriendCompareMetricItem } from "@/components/friends/friend-compare-grid";
import { useTranslations } from "@/components/i18n-provider";
import { BottomActionDock } from "@/components/ui/bottom-action-dock";

type FriendCompareWorkspaceProps = {
  friendUserId: string;
  items: FriendCompareMetricItem[];
};

export function FriendCompareWorkspace({ friendUserId, items }: FriendCompareWorkspaceProps) {
  const t = useTranslations();
  const [editMode, setEditMode] = useState(false);
  const [sortByDiff, setSortByDiff] = useState(false);
  const storageKey = `insightup.friend-compare.metric-order.${friendUserId}`;

  return (
    <>
      <FriendCompareGrid editMode={editMode} items={items} sortByDiff={sortByDiff} storageKey={storageKey} />
      <BottomActionDock
        items={[
          {
            active: editMode,
            ariaLabel: t("dashboardTrendUi.visibility"),
            icon: editMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
            label: t("dashboardTrendUi.visibility"),
            onClick: () => setEditMode((current) => !current),
            title: t("dashboardTrendUi.visibility"),
          },
          {
            active: sortByDiff,
            ariaLabel: t("friends.sortByDiff"),
            icon: <ArrowDownWideNarrow className="size-4" />,
            label: t("friends.sortByDiff"),
            onClick: () => setSortByDiff((current) => !current),
            title: t("friends.sortByDiff"),
          },
        ]}
      />
    </>
  );
}
