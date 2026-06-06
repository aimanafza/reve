import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reveal — Tailor-made, agreed on first",
  description: "The space between what you imagine and what gets made.",
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
