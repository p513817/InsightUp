"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale, MessageDictionary } from "@/lib/i18n";
import { createTranslator, defaultLocale, getLocaleLabel, localeCookieName } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  t: ReturnType<typeof createTranslator>;
};

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  t: createTranslator({}),
});

export function I18nProvider({
  children,
  locale,
  messages,
}: Readonly<{
  children: React.ReactNode;
  locale: Locale;
  messages: MessageDictionary;
}>) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: createTranslator(messages),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useLocale() {
  return useI18n().locale;
}

export function useTranslations() {
  return useI18n().t;
}

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export { getLocaleLabel };
