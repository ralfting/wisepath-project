import type { Metadata } from "next";
import "./globals.css";
// Mantine after globals.css; globals only adds touches Mantine does not cover
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Atkinson_Hyperlegible, Spectral } from "next/font/google";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WisePath",
  description: "Document and share your learning journeys",
};

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

// Italic serif for star names on the project chart and page titles
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic"],
  variable: "--font-star",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variables sit on <html> so the theme's :root font stacks can use them
    <html lang="en" className={`${atkinson.variable} ${spectral.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
