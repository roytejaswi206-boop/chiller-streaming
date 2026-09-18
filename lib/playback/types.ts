export type ProviderHealthStatus =
  | "ACTIVE"
  | "CONFIGURED"
  | "REACHABLE"
  | "HTTP_REACHABLE"
  | "EMBED_LOADED"
  | "PLAYER_READY"
  | "PLAYBACK_STARTED"
  | "PLAYBACK_VERIFIED"
  | "PLAYER_NOT_VERIFIABLE"
  | "PLAYBACK_FAILED"
  | "REQUEST_FAILED"
  | "VERIFIED"
  | "DEGRADED"
  | "FAILED"
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "UNKNOWN";

/**
 * Distinct playback lifecycle states for a single content + source combination.
 * Server-side resolution produces DISCOVERED.
 * Browser iframe advances to IFRAME_LOADED, PLAYER_READY, PLAY_STARTED.
 * NEVER claim PLAY_STARTED based on HTTP status alone.
 */
export type ContentPlaybackStatus =
  | "DISCOVERED"    // Resolver built a candidate URL — not yet loaded in browser
  | "HTTP_OK"       // Server-side HEAD probe returned 2xx (reachability, not playback)
  | "IFRAME_LOADED" // iframe onLoad fired — page responded, player may not be ready
  | "PLAYER_READY"  // Provider emitted ready event (e.g. cinesrc:ready)
  | "PLAY_STARTED"  // Provider emitted play event (actual verified playback)
  | "PLAYBACK_ERROR"// Provider emitted error event or internal detection failed
  | "UNAVAILABLE";  // All providers exhausted

export interface PlaybackSource {
  providerId: string;
  providerName: string;
  type: "embed" | "hls" | "mp4";
  url: string;
  available: boolean;
  priority: number;
  quality?: string;
  statusText?: string;
  latencyMs?: number;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number | string;
  anilistId?: number | string;
  season?: number;
  episode?: number;
  progressTrackingSupported?: boolean;
  // Client-side lifecycle (populated by ExternalPlayer, not resolver)
  status?: ContentPlaybackStatus;
  error?: string;
  verified?: boolean;
}

export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: string;
  latencyMs?: number;
  lastError?: string;
  lastSuccessfulPlayback?: string;
  totalSuccess: number;
  totalFailures: number;
}

export interface PlaybackProvider {
  id: string;
  name: string;
  enabled: boolean;
  requiresApiKey: boolean;
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime?: boolean;
  priority: number;

  getMoviePlayback(tmdbId: number | string): Promise<PlaybackSource | null>;
  getTVPlayback(tmdbId: number | string, season: number, episode: number): Promise<PlaybackSource | null>;
  getAnimePlayback?(anilistId: number | string, episode: number): Promise<PlaybackSource | null>;
  healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }>;
}
