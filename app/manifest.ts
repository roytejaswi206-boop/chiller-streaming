import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CHILLER — Just Chill.",
    short_name: "CHILLER",
    description: "Cinematic entertainment discovery and streaming platform for Movies, Anime, and TV Series.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090C",
    theme_color: "#09090C",
    orientation: "any",
    icons: [
      {
        src: "/placeholder-poster.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/placeholder-poster.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
