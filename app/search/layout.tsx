import { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Search Movies, Series & Anime | CHILLER",
  description: "Search thousands of movies, TV series, and anime titles across the CHILLER streaming catalogue.",
  alternates: {
    canonical: getCanonicalUrl("/search"),
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
