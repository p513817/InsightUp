import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDashboardMetricOrder,
  MissingDashboardPreferencesTableError,
  upsertDashboardMetricOrder,
} from "@/lib/dashboard-preferences";

function createSelectClient(response: { data: { metric_order: string[] | null } | null; error: { code?: string } | null }) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => response,
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function createUpsertClient(error: { code?: string } | null, calls: Array<{ metric_order: string[]; user_id: string }>) {
  return {
    from() {
      return {
        upsert: async (payload: { metric_order: string[]; user_id: string }) => {
          calls.push(payload);
          return { error };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("dashboard preferences", () => {
  it("returns an empty metric order when the preferences table is missing", async () => {
    const supabase = createSelectClient({
      data: null,
      error: { code: "PGRST205" },
    });

    await expect(getDashboardMetricOrder(supabase, "user-1")).resolves.toEqual([]);
  });

  it("throws a clear error when saving preferences without the migration", async () => {
    const calls: Array<{ metric_order: string[]; user_id: string }> = [];
    const supabase = createUpsertClient({ code: "PGRST205" }, calls);

    await expect(upsertDashboardMetricOrder(supabase, "user-1", ["weight", "weight", "muscle"])).rejects.toBeInstanceOf(
      MissingDashboardPreferencesTableError,
    );
    expect(calls).toEqual([{ metric_order: ["weight", "muscle"], user_id: "user-1" }]);
  });
});