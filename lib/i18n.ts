import enMessages from "../messages/en.json";
import zhHantMessages from "../messages/zh-Hant.json";

export const locales = ["zh-Hant", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-Hant";
export const localeCookieName = "insightup-locale";

export type MessageDictionary = Record<string, unknown>;
export type TranslationParams = Record<string, string | number>;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh-Hant" || value === "en";
}

export function getLocaleLabel(locale: Locale) {
  return locale === "en" ? "English" : "\u7e41\u9ad4\u4e2d\u6587";
}

export function getLocaleDirection(_locale: Locale) {
  return "ltr" as const;
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();

  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("zh")) return "zh-Hant";
  if (value === "zh-Hant") return "zh-Hant";

  return null;
}

export function detectLocaleFromAcceptLanguage(value: string | null | undefined): Locale {
  const parts =
    value
      ?.split(",")
      .map((part) => part.trim().split(";")[0])
      .filter(Boolean) ?? [];

  for (const part of parts) {
    const locale = normalizeLocale(part);
    if (locale) return locale;
  }

  return defaultLocale;
}

export async function loadMessages(locale: Locale) {
  return (locale === "en" ? enMessages : zhHantMessages) as MessageDictionary;
}

function resolvePath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export function createTranslator(messages: MessageDictionary) {
  return function translate(key: string, params?: TranslationParams) {
    const value = resolvePath(messages, key);
    if (typeof value === "string") {
      return interpolate(value, params);
    }

    return key;
  };
}
