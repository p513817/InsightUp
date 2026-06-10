import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocaleDirection } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n/server";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { locale, messages } = await getServerTranslations();

  return (
    <html data-scroll-behavior="smooth" dir={getLocaleDirection(locale)} lang={locale} suppressHydrationWarning>
      <body
        className="grain-overlay"
        style={
          {
            "--font-display": "Georgia, serif",
            "--font-body": "system-ui",
          } as CSSProperties
        }
        suppressHydrationWarning
      >
        <I18nProvider key={locale} locale={locale} messages={messages}>
          {children}
          <Toaster position="top-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
