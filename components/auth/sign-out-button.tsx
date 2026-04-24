"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} disabled={isLoading}>
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      <span className="hidden sm:inline">登出</span>
    </Button>
  );
}