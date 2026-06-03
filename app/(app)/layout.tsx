import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { ensureCurrentUserProfile } from "@/lib/friends/service";
import { summarizeUser } from "@/lib/presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const startedAt = Date.now();
  console.log("[InsightUp protected layout]", {
    event: "layout-start",
    time: new Date().toISOString(),
  });
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await ensureCurrentUserProfile(supabase, user);
  console.log("[InsightUp protected layout]", {
    durationMs: Date.now() - startedAt,
    event: "layout-complete",
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={summarizeUser(user)} />
      <main
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pt-4 pb-8 lg:px-10 lg:pt-5 lg:pb-10"
        style={{
          minHeight: "calc(100vh - var(--app-header-offset, 0px))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
