import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";
import { PwaUpdateManager } from "@/components/pwa/PwaUpdateManager";
import { PwaInstallBanner } from "@/components/layout/PwaInstallBanner";
import { ActivityTracker } from "@/components/analytics/ActivityTracker";
import { getCanonicalUrl } from "@/lib/config/site";
import { JsonLd, buildWebSiteSchema } from "@/components/seo/JsonLd";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#09090C",
};

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalUrl("/")),
  title: {
    default: "CHILLER — Watch Beyond",
    template: "%s • CHILLER",
  },
  description: "A premium streaming and discovery experience for Movies, Anime, and TV Series.",
  keywords: ["chiller", "streaming", "movies", "anime", "series", "tv shows", "watch beyond", "sub", "dub", "free streaming"],
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: getCanonicalUrl("/"),
    title: "CHILLER — Watch Beyond",
    description: "A premium streaming and discovery experience for Movies, Anime, and TV Series.",
    siteName: "CHILLER",
    images: [
      {
        url: "/branding/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CHILLER — Watch Beyond",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER — Watch Beyond",
    description: "A premium streaming and discovery experience for Movies, Anime, and TV Series.",
    images: ["/branding/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen min-h-[100dvh] bg-[#09090C] text-[#F8FAFC] antialiased selection:bg-[#FF3B6B] selection:text-white pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 overflow-x-hidden">
        <JsonLd schema={buildWebSiteSchema()} />
        <Providers>
          <ActivityTracker />
          <PwaUpdateManager>
            <Header />
            {children}
            <Footer />
            <MobileNav />
            <PwaInstallBanner />
          </PwaUpdateManager>
        </Providers>
      </body>
    </html>
  );
}
