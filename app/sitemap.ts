import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const routes = [
    "",
    "/movies",
    "/series",
    "/anime",
    "/trending",
    "/search",
    "/watchlist",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
}
