import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, DM_Sans, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

// Geist is used for the Vibe Check poster; the rest of the site keeps its own font stack.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "The Katalyst by Klaryze",
    template: `%s — The Katalyst by Klaryze`,
  },
  description: profile.shortBio,
  keywords: [
    "Meryll Klaryze Polaron",
    "The Katalyst",
    "Business Application Developer",
    "UI/UX Designer",
    "Portfolio",
    "Startup Founder",
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${profile.name} — ${profile.headline}`,
    description: profile.shortBio,
    siteName: "The Katalyst by Klaryze",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${profile.headline}`,
    description: profile.shortBio,
  },
  icons: {
    icon: [{ url: "/images/katalyst-logo.png", type: "image/png" }],
    shortcut: "/images/katalyst-logo.png",
    apple: "/images/katalyst-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        spaceGrotesk.variable,
        dmSans.variable,
        inter.variable,
        "font-sans",
      )}
    >
      <head>
        <link href="https://fonts.cdnfonts.com/css/instagram-sans-2" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="data-theme" storageKey="katalyst-theme" defaultTheme="dark" enableSystem={false} enableColorScheme={false}>
          <SoundProvider>{children}</SoundProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
