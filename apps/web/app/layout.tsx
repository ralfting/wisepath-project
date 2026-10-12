import type { Metadata } from "next";
import "./globals.css";
// Mantine after globals.css; globals only adds touches Mantine does not cover
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WisePath",
  description: "Map what you are learning: modules, topics and how they connect",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variables sit on <html> so the theme's :root font stacks can use them
    <html lang="en" className={inter.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
