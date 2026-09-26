import { Metadata } from "next";
import CalendarPage from "@/app/calendar/page";
import { getCanonicalUrl } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upcoming Movies & Shows — Release Calendar • CHILLER",
  description: "Explore upcoming movie premieres and anticipated TV show releases on CHILLER. Stay updated on premiere dates.",
  alternates: {
    canonical: getCanonicalUrl("/upcoming"),
  },
  openGraph: {
    title: "CHILLER | Upcoming Movies & Shows",
    description: "Explore upcoming movie premieres and anticipated TV show releases on CHILLER.",
    url: getCanonicalUrl("/upcoming"),
    siteName: "CHILLER",
    type: "website",
    images: [{ url: "/branding/og-image.jpg", width: 1200, height: 630, alt: "Upcoming on CHILLER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHILLER | Upcoming Movies & Shows",
    description: "Explore upcoming movie premieres and anticipated TV show releases on CHILLER.",
    images: ["/branding/og-image.jpg"],
  },
};

export default CalendarPage;
