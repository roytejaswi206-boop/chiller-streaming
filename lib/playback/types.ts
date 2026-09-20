export type ProviderHealthStatus =
  | "ACTIVE"
  | "CONFIGURED"
  | "REACHABLE"
  | "HTTP_REACHABLE"
  | "EMBED_LOADED"
  | "PLAYER_READY"
  | "PLAYBACK_STARTED"
  | "PLAYBACK_CONFIRMED"
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
 * Server-side resolution produces CANDIDATE_FOUND or DISCOVERED.
 * Browser iframe advances to EMBED_LOADED, PLAYER_READY, PLAYBACK_CONFIRMED, etc.
 * NEVER claim PLAYBACK_CONFIRMED based on HTTP status alone.
 */
export type ContentPlaybackStatus =
  | "IDLE"
  | "RESOLVING"
  | "CANDIDATE_FOUND"
  | "DISCOVERED"         // Alias for backwards compatibility
  | "CONNECTING"
  | "HTTP_OK"            // Server-side HEAD probe returned 2xx (reachability, not playback)
  | "EMBED_LOADED"       // iframe onLoad fired — page responded, player may not be ready
  | "IFRAME_LOADED"      // Alias for backwards compatibility
  | "PLAYER_READY"       // Provider emitted ready event (e.g. cinesrc:ready)
  | "PLAY_STARTED"       // Provider emitted play event (actual verified playback)
  | "PLAYBACK_CONFIRMED" // Verified active video progression or direct play signal
  | "PLAYBACK_NOT_VERIFIABLE" // Cross-origin sandbox prevents inspection; treat as unverified
  | "PLAYBACK_FAILED"    // Provider emitted error event or playback timeout
  | "PLAYBACK_ERROR"     // Alias for backwards compatibility
  | "FALLING_BACK"       // Transitioning to next candidate
  | "ALL_PROVIDERS_FAILED"
  | "UNAVAILABLE"        // All candidates exhausted
  | "ENDED";

export interface PlaybackRequest {
  mediaType: "movie" | "tv" | "anime";
  tmdbId?: number | string;
  anilistId?: number | string;
  malId?: number | string;
  imdbId?: string;
  season?: number;
  episode?: number;
  language?: "sub" | "dub";
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ProviderCapabilities {
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime: boolean;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsEvents: boolean;
  requiresApiKey: boolean;
  hasCaptions: boolean;
}

export interface PlaybackSource {
  providerId: string;
  providerName: string;
  type: "embed" | "hls" | "mp4";
  url: string;
  available: boolean;
  priority: number;
  score?: number;
  quality?: string;
  statusText?: string;
  latencyMs?: number;
  mediaType?: "movie" | "tv" | "anime";
  tmdbId?: number | string;
  anilistId?: number | string;
  malId?: number | string;
  imdbId?: string;
  season?: number;
  episode?: number;
  language?: "sub" | "dub";
  serverLabel?: string;
  serverNumber?: number;
  expiresAt?: number;
  progressTrackingSupported?: boolean;
  status?: ContentPlaybackStatus;
  error?: string;
  verified?: boolean;
}

export type PlaybackCandidate = PlaybackSource;

export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: string;
  latencyMs?: number;
  lastError?: string;
  lastSuccess?: string;
  lastSuccessfulPlayback?: string;
  lastFailure?: string;
  totalSuccess: number;
  totalFailures: number;
  averageStartupMs?: number;
  recentStartupMs?: number;
  cooldownUntil?: number;
  score?: number;
}

export interface PlaybackTelemetry {
  episodeClick?: number;
  resolutionStart?: number;
  candidateReceived?: number;
  playerMount?: number;
  embedLoaded?: number;
  playerReady?: number;
  playbackConfirmed?: number;
  firstProgress?: number;
  resolutionMs?: number;
  playerLoadMs?: number;
  playbackStartupMs?: number;
  totalStartupMs?: number;
}

export interface PlaybackProvider {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Standardized methods
  supports(request: PlaybackRequest): boolean;
  resolve(request: PlaybackRequest): Promise<PlaybackCandidate | null>;
  getCapabilities(): ProviderCapabilities;
  getHealth(): ProviderHealth;
  healthCheck(): Promise<{
    status: ProviderHealthStatus;
    latencyMs?: number;
    message?: string;
  }>;

  // Backward compatibility properties & methods
  requiresApiKey?: boolean;
  supportsMovie?: boolean;
  supportsTV?: boolean;
  supportsAnime?: boolean;
  getMoviePlayback?(tmdbId: number | string): Promise<PlaybackSource | null>;
  getTVPlayback?(tmdbId: number | string, season: number, episode: number): Promise<PlaybackSource | null>;
  getAnimePlayback?(anilistId: number | string, episode: number): Promise<PlaybackSource | null>;
}
