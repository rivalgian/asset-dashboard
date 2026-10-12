import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Management Dashboard",
  description: "Dashboard inventaris aset",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
