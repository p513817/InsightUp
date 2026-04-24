function invariant(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSupabaseEnv() {
  return {
    url: invariant(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: invariant(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSiteUrl(fallbackOrigin?: string) {
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "http://127.0.0.1:3000");
}

export function getOAuthRedirectUrl(fallbackOrigin?: string) {
  return new URL("/auth/callback", getSiteUrl(fallbackOrigin)).toString();
}