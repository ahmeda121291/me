import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/constants";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: TAGLINE,
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: TAGLINE,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E7" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1813" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${mono.variable} min-h-dvh`}>
        <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-4">
          <a href="/" className="text-lg font-semibold tracking-tight">
            {SITE_NAME}
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/play" className="opacity-80 hover:opacity-100">
              Play
            </a>
            <a href="/club" className="text-bronze">
              The Club
            </a>
            <a href="/me" aria-label="Your locker" className="opacity-80">
              ◍
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
