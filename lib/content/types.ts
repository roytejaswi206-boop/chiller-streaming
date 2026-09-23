export type ContentType = "movie" | "tv" | "anime" | "person";

export type ContentProviderStatus =
  | "ACTIVE"
  | "DEGRADED"
  | "FAILED"
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "NOT_SUPPORTED";

export interface ExternalIds {
  tmdbId?: number;
  imdbId?: string;
  anilistId?: number;
  malId?: number;
  kitsuId?: string;
  tvmazeId?: number;
  tvdbId?: number;
}

export interface ChillerEpisode {
  id: string | number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string;
  airDate?: string;
  thumbnailUrl?: string;
  rating?: number;
  runtime?: number;
}

export interface ChillerSeason {
  seasonNumber: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  episodeCount: number;
  airDate?: string;
  episodes?: ChillerEpisode[];
}

export interface WhereToWatchProvider {
  id: number | string;
  name: string;
  type: "sub" | "rent" | "buy" | "free";
  logoUrl?: string;
  webUrl?: string;
  format?: string;
  price?: string;
}

export interface ChillerAvailability {
  title: string;
  year?: number;
  country: string;
  lastUpdated: string;
  streamProviders: WhereToWatchProvider[];
  rentProviders: WhereToWatchProvider[];
  buyProviders: WhereToWatchProvider[];
}

export interface ChillerContent {
  id: string;
  type: ContentType;
  title: string;
  originalTitle?: string;
  alternativeTitles?: string[];
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate?: string;
  year?: string;
  genres: string[];
  languages: string[];
  originalLanguage?: string;
  country?: string;
  rating: number;
  popularity?: number;
  runtime?: number;
  status?: string;

  // External identifiers
  externalIds: ExternalIds;

  // Anime specific
  romajiTitle?: string;
  englishTitle?: string;
  nativeTitle?: string;
  studios?: string[];
  format?: string;
  animeSeason?: string;
  characters?: { name: string; role?: string; imageUrl?: string }[];

  // TV / Series specific
  totalSeasons?: number;
  totalEpisodes?: number;
  seasons?: ChillerSeason[];
  currentSeasonDetails?: ChillerSeason;

  // Cast & crew
  cast?: { id: number | string; name: string; character: string; profileUrl?: string | null }[];

  // Metadata Source Tracking
  primarySource: string;
  enrichedSources: string[];
  lastUpdated: string;
}

export interface ContentProvider {
  id: string;
  name: string;
  category: "general" | "anime" | "tv" | "availability" | "subtitles";
  enabled: boolean;
  requiresApiKey: boolean;
  priority: number;

  search(query: string, type?: ContentType): Promise<ChillerContent[]>;
  getMovie?(id: number | string): Promise<ChillerContent | null>;
  getTV?(id: number | string): Promise<ChillerContent | null>;
  getAnime?(id: number | string): Promise<ChillerContent | null>;
  getSeason?(id: number | string, seasonNumber: number): Promise<ChillerSeason | null>;
  getEpisode?(id: number | string, seasonNumber: number, episodeNumber: number): Promise<ChillerEpisode | null>;
  getAvailability?(tmdbId: number, type: "movie" | "tv"): Promise<ChillerAvailability | null>;

  healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }>;
}
