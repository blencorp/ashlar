import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashlar Next.js Example | Benefits intake",
  description:
    "Next.js App Router Ashlar example showing a public-service page shell, source-owned Button capsule, and runtime agency theme switching.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23005ea8'/%3E%3Cpath d='M16 24h32v4H16zm0 12h22v4H16zm0 12h28v4H16z' fill='white'/%3E%3C/svg%3E",
  },
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
