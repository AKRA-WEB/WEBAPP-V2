import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AKRA WEBAPP V2",
  description: "Unified AKRA operations workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
