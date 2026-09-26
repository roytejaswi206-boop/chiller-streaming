import { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Trending Movies & TV Shows Today — Watch Beyond",
  description: "Discover what is popular right now across movies, television series, and anime on CHILLER. Real-time trending charts and community favorites.",
  alternates: {
    canonical: getCanonicalUrl("/trending"),
  },
  openGraph: {
    title: "CHILLER | Trending Movies & TV Shows Today",
    description: "Discover what is popular right now across movies, television series, and anime on CHILLER.",
    url: getCanonicalUrl("/trending"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Trending on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER | Trending Movies & TV Shows Today",
    description: "Discover what is popular right now across movies, television series, and anime on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
