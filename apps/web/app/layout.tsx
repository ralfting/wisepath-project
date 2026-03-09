import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/domain/auth";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "WisePath",
  description: "Document and share your learning journeys",
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
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
