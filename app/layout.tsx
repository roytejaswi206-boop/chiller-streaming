import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";
import "./globals.css";

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
      <body className="min-h-screen bg-[#09090C] text-[#F8FAFC] antialiased selection:bg-[#FF3B6B] selection:text-white pb-16 lg:pb-0">
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
