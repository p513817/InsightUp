import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { ensureCurrentUserProfile } from "@/lib/friends/service";
import { summarizeUser } from "@/lib/presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await ensureCurrentUserProfile(supabase, user);

  return (
    <div className="min-h-screen">
      <AppHeader user={summarizeUser(user)} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}