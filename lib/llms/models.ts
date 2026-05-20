export const DEFAULT_GEMINI_ROTATION_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
] as const;

export function parseEntitlementConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export function getModelPool(config: Record<string, unknown>) {
  const configuredPool = Array.isArray(config.model_pool)
    ? config.model_pool.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!configuredPool.length) {
    return [...DEFAULT_GEMINI_ROTATION_MODELS];
  }

  return config.allow_rotation === false ? [configuredPool[0]] : configuredPool;
}
