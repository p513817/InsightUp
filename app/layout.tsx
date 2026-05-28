import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_TC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocaleDirection } from "@/lib/i18n";
import { getServerTranslations } from "@/lib/i18n/server";

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const fontBody = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-body",
});

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, messages } = await getServerTranslations();

  return (
    <html data-scroll-behavior="smooth" dir={getLocaleDirection(locale)} lang={locale} suppressHydrationWarning>
      <body className={`${fontDisplay.variable} ${fontBody.variable} grain-overlay`} suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
