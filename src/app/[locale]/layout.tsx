import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "OmniCut AI - Intelligent Video Editor",
  description:
    "Web-based intelligent video editing platform with AI subtitles, silence removal, voiceover and smart cutout.",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${jakarta.variable} ${plexThai.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
