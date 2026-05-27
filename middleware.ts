import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { defaultLocale, detectLocaleFromAcceptLanguage, isLocale, localeCookieName } from "@/lib/i18n";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const currentLocale = request.cookies.get(localeCookieName)?.value;

  if (!isLocale(currentLocale)) {
    const locale = detectLocaleFromAcceptLanguage(request.headers.get("accept-language")) || defaultLocale;
    request.cookies.set(localeCookieName, locale);
    response.cookies.set(localeCookieName, locale, {
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
