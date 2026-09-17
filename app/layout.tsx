import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Relay — Gangnam Beauty Guide",
  description: "An auditable Korean beauty-review ingestion workflow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
