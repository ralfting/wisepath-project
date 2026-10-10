import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/domain/auth";
import { Atkinson_Hyperlegible, Spectral } from "next/font/google";

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
    <html lang="en">
      <body className={`${atkinson.variable} ${spectral.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
