import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WisePath",
  description: "Document and share your learning journeys",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
