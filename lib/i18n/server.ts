import { cookies, headers } from "next/headers";
import { createTranslator, detectLocaleFromAcceptLanguage, localeCookieName, loadMessages, normalizeLocale, type Locale } from "@/lib/i18n";

export async function resolveLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = normalizeLocale(cookieStore.get(localeCookieName)?.value);
  if (cookieLocale) return cookieLocale;

  const acceptLanguage = headerStore.get("accept-language");
  return detectLocaleFromAcceptLanguage(acceptLanguage);
}

export async function getServerTranslations() {
  const locale = (await resolveLocale()) as Locale;
  const messages = await loadMessages(locale);
  return {
    locale,
    messages,
    t: createTranslator(messages),
  };
}
