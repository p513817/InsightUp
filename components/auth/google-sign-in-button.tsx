"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getOAuthRedirectUrl } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  nextPath?: string;
}

export function GoogleSignInButton({ nextPath = "/dashboard" }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const redirectUrl = new URL(getOAuthRedirectUrl(window.location.origin));
      redirectUrl.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google login failed.");
      setIsLoading(false);
    }
  }

  return (
    <Button size="lg" onClick={handleSignIn} disabled={isLoading}>
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      使用 Google 登入
    </Button>
  );
}