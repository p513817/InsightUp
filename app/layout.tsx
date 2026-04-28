import type { Metadata } from "next";
import { Fraunces, Noto_Sans_TC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const fontBody = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "InsightUp",
  description: "Track InBody records, review chart trends, and manage reliable body composition history.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-Hant" suppressHydrationWarning>
      <body className={`${fontDisplay.variable} ${fontBody.variable} grain-overlay`} suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}