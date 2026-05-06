import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashlar Next.js Example | Benefits intake",
  description:
    "Next.js App Router Ashlar example showing a public-service page shell, source-owned Button capsule, and runtime agency theme switching.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-ashlar-theme="default" data-ashlar-mode="light">
      <body>{children}</body>
    </html>
  );
}
