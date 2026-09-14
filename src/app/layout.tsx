import type { Metadata, Viewport } from "next";

// Self-hosted fonts (bundled via npm) instead of next/font/google, which
// needs to reach fonts.googleapis.com at `next build` time. That fetch is
// unreliable in sandboxed/CI network environments (including some Vercel
// builds) and was causing the production build to fail. @fontsource ships
// the same font files locally, so the build never touches the network.
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buzzr — live quizzes, real time",
  description: "Host and play real-time multiplayer quizzes. No app, no login for players — just scan and play.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#14142B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
