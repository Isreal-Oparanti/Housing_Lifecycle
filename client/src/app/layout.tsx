import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueCost — Rental Cost Intelligence",
  description: "See the true recurring monthly cost of renting in the UK, starting with Council Tax.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
