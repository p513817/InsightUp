import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEntitlementConfig, releaseDailyFeatureUsage, reserveDailyFeatureUsage, resolveMyFeatureEntitlement } from "@/lib/llms/usage";

function createRpcClient(handler: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) {
  return {
    rpc(fn: string, args: Record<string, unknown>) {
      return handler(fn, args);
    },
  } as unknown as SupabaseClient;
}

describe("llm usage helpers", () => {
  it("normalizes unexpected entitlement config values", () => {
    expect(parseEntitlementConfig(null)).toEqual({});
    expect(parseEntitlementConfig(["not", "an", "object"])).toEqual({});
    expect(parseEntitlementConfig({ allow_rotation: false })).toEqual({ allow_rotation: false });
  });

  it("resolves entitlement rows from rpc results", async () => {
    const supabase = createRpcClient(async (fn, args) => {
      expect(fn).toBe("resolve_my_feature_entitlement");
      expect(args).toEqual({ input_feature: "trend_summary" });
      return {
        data: [{ plan_code: "pro", daily_limit: 5, config: { allow_rotation: false } }],
        error: null,
      };
    });

    await expect(resolveMyFeatureEntitlement(supabase, "trend_summary")).resolves.toEqual({
      planCode: "pro",
      dailyLimit: 5,
      config: { allow_rotation: false },
    });
  });

  it("uses the atomic reservation rpc result", async () => {
    const supabase = createRpcClient(async (fn, args) => {
      expect(fn).toBe("reserve_my_daily_feature_usage");
      expect(args).toEqual({
        input_feature: "inbody_scan",
        input_request_date: "2026-07-06",
        input_daily_limit: 1,
      });
      return {
        data: [{ allowed: true, usage_count: 1 }],
        error: null,
      };
    });

    await expect(reserveDailyFeatureUsage(supabase, "inbody_scan", "2026-07-06", 1)).resolves.toEqual({
      allowed: true,
      usageCount: 1,
    });
  });

  it("calls the refund rpc on failed generations", async () => {
    const supabase = createRpcClient(async (fn, args) => {
      expect(fn).toBe("release_my_daily_feature_usage");
      expect(args).toEqual({
        input_feature: "trend_summary",
        input_request_date: "2026-07-06",
      });
      return {
        data: [{ usage_count: 0 }],
        error: null,
      };
    });

    await expect(releaseDailyFeatureUsage(supabase, "trend_summary", "2026-07-06")).resolves.toBeUndefined();
  });
});
