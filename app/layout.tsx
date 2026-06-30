import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import { Suspense } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { RouteTransitionIndicator } from "@/components/ui/route-transition-indicator";
import { getLocaleDirection } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n/server";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const notoSansTc = Noto_Sans_TC({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "600", "700", "800", "900"],
});

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
        className={`${notoSansTc.variable} grain-overlay`}
        style={
          {
            "--font-display": 'var(--font-noto-sans-tc), "Noto Sans TC", "Microsoft JhengHei", "Microsoft JhengHei UI", "PingFang TC", system-ui',
            "--font-body": 'var(--font-noto-sans-tc), "Noto Sans TC", "Microsoft JhengHei", "Microsoft JhengHei UI", "PingFang TC", system-ui',
          } as CSSProperties
        }
        suppressHydrationWarning
      >
        <I18nProvider key={locale} locale={locale} messages={messages}>
          <Suspense fallback={null}>
            <RouteTransitionIndicator />
          </Suspense>
          {children}
          <Toaster position="top-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
