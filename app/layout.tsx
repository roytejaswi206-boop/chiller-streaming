import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#09090C",
};

export const metadata: Metadata = {
  title: "Chiller — Just Chill.",
  description: "Cinematic entertainment discovery and streaming platform for Movies, Anime, TV Series, and Documentaries. Good Stories. Better Days.",
  keywords: ["chiller", "streaming", "movies", "anime", "series", "tv shows", "documentaries", "tmdb", "codespecter"],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
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
        <Providers>
          <Header />
          {children}
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
