import { redirect } from "next/navigation";
import { AppHeader } from "@/components/navigation/app-header";
import { ContentTransitionShell } from "@/components/ui/content-transition-shell";
import { ensureCurrentUserProfileExists } from "@/lib/friends/service";
import { summarizeUser } from "@/lib/presentation";
import { CONTENT_TRANSITION_START_EVENT } from "@/lib/route-transition-feedback";
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
        <ContentTransitionShell
          eventName={CONTENT_TRANSITION_START_EVENT}
          loadingContentClassName="pointer-events-none opacity-0"
          minVisibleMs={650}
          mode="event"
          overlayMode="fixed"
          waitForPathnameChange
        >
          {children}
        </ContentTransitionShell>
      </main>
    </div>
  );
}
