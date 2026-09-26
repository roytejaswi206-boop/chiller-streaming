import React from "react";
import { getCanonicalUrl } from "@/lib/config/site";

interface JsonLdProps {
  schema: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Renders a standardized, safe JSON-LD script tag for search engine crawlers.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Builds standard WebSite Schema with SearchAction
 */
export function buildWebSiteSchema() {
  const siteUrl = getCanonicalUrl("/");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: "CHILLER",
    alternateName: ["CHILLER Streaming", "Chiller"],
    url: siteUrl,
    description: "A premium streaming and discovery experience for Movies, Anime, and TV Series.",
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getCanonicalUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Builds BreadcrumbList Schema
 */
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Builds Movie Schema adhering strictly to legitimate metadata
 */
export function buildMovieSchema(movie: {
  id: number | string;
  title: string;
  overview?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  rating?: number;
  voteCount?: number;
  cast?: Array<{ name: string }>;
  country?: string;
}) {
  const canonicalUrl = getCanonicalUrl(`/movie/${movie.id}`);
  const images: string[] = [];
  if (movie.backdropPath) {
    images.push(
      movie.backdropPath.startsWith("http")
        ? movie.backdropPath
        : `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`
    );
  }
  if (movie.posterPath) {
    images.push(
      movie.posterPath.startsWith("http")
        ? movie.posterPath
        : `https://image.tmdb.org/t/p/w780${movie.posterPath}`
    );
  }

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "@id": `${canonicalUrl}#movie`,
    url: canonicalUrl,
    name: movie.title,
    description: movie.overview || undefined,
    image: images.length > 0 ? (images.length === 1 ? images[0] : images) : undefined,
    datePublished: movie.releaseDate || undefined,
    duration: movie.runtime && movie.runtime > 0 ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres && movie.genres.length > 0 ? movie.genres : undefined,
    countryOfOrigin: movie.country ? { "@type": "Country", name: movie.country } : undefined,
  };

  // Only include aggregateRating when legitimate rating and positive vote count exist
  if (movie.rating && movie.rating > 0 && movie.voteCount && movie.voteCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(movie.rating.toFixed(1)),
      bestRating: 10,
      worstRating: 1,
      ratingCount: movie.voteCount,
    };
  }

  // Only include legitimate cast if provided
  if (movie.cast && movie.cast.length > 0) {
    schema.actor = movie.cast.slice(0, 10).map((c) => ({
      "@type": "Person",
      name: c.name,
    }));
  }

  return schema;
}

/**
 * Builds TVSeries Schema adhering strictly to legitimate metadata
 */
export function buildTVSeriesSchema(series: {
  id: number | string;
  name: string;
  overview?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  firstAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres?: string[];
  rating?: number;
  voteCount?: number;
  cast?: Array<{ name: string }>;
  country?: string;
  isAnime?: boolean;
}) {
  const pathPrefix = series.isAnime ? "/anime" : "/tv";
  const canonicalUrl = getCanonicalUrl(`${pathPrefix}/${series.id}`);
  const images: string[] = [];
  if (series.backdropPath) {
    images.push(
      series.backdropPath.startsWith("http")
        ? series.backdropPath
        : `https://image.tmdb.org/t/p/w1280${series.backdropPath}`
    );
  }
  if (series.posterPath) {
    images.push(
      series.posterPath.startsWith("http")
        ? series.posterPath
        : `https://image.tmdb.org/t/p/w780${series.posterPath}`
    );
  }

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "@id": `${canonicalUrl}#tvseries`,
    url: canonicalUrl,
    name: series.name,
    description: series.overview || undefined,
    image: images.length > 0 ? (images.length === 1 ? images[0] : images) : undefined,
    startDate: series.firstAirDate || undefined,
    numberOfSeasons: series.numberOfSeasons || undefined,
    numberOfEpisodes: series.numberOfEpisodes || undefined,
    genre: series.genres && series.genres.length > 0 ? series.genres : undefined,
    countryOfOrigin: series.country ? { "@type": "Country", name: series.country } : undefined,
  };

  if (series.rating && series.rating > 0 && series.voteCount && series.voteCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(series.rating.toFixed(1)),
      bestRating: 10,
      worstRating: 1,
      ratingCount: series.voteCount,
    };
  }

  if (series.cast && series.cast.length > 0) {
    schema.actor = series.cast.slice(0, 10).map((c) => ({
      "@type": "Person",
      name: c.name,
    }));
  }

  return schema;
}

/**
 * Builds CollectionPage Schema
 */
export function buildCollectionSchema(title: string, description: string, path: string) {
  const canonicalUrl = getCanonicalUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collection`,
    url: canonicalUrl,
    name: title,
    description,
    isPartOf: {
      "@type": "WebSite",
      name: "CHILLER",
      url: getCanonicalUrl("/"),
    },
  };
}
