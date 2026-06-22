import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { ensureCurrentUserProfileExists } from "@/lib/friends/service";
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

  await ensureCurrentUserProfileExists(supabase, user);

  return (
    <div className="min-h-screen">
      <AppHeader user={summarizeUser(user)} />
      <main
        className="mx-auto flex w-full max-w-[30rem] flex-col gap-8 px-4 pt-4 pb-8 sm:px-5 lg:pt-5 lg:pb-10"
        style={{
          minHeight: "calc(100vh - var(--app-header-offset, 0px))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
