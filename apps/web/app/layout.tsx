import type { Metadata } from "next";
import "./globals.css";
// Mantine after globals.css; globals only adds touches Mantine does not cover
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Inter } from "next/font/google";
import { cookies, headers } from "next/headers";
import { Providers } from "./providers";
import { LOCALE_COOKIE, fromAcceptLanguage, isLocale } from "@/i18n/locales";

export const metadata: Metadata = {
  title: "WisePath",
  description: "Map what you are learning: modules, topics and how they connect",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The language chosen (its cookie) or the browser's, so the page is rendered in it from the first byte
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const choice = isLocale(chosen) ? chosen : null;
  const locale = choice ?? fromAcceptLanguage((await headers()).get("accept-language"));
  return (
    // Font variables sit on <html> so the theme's :root font stacks can use them
    <html lang={locale} className={inter.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers locale={locale} choice={choice}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
