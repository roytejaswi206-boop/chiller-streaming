import { MediaClass } from "./media-classifier";

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

export type PlaybackPool = "GENERAL" | "ANIME";

export interface PlaybackRequest {
  mediaType: "movie" | "tv" | "anime" | "video";
  mediaClass?: MediaClass;
  targetPool?: PlaybackPool;
  tmdbId?: number | string;
  anilistId?: number | string;
  malId?: number | string;
  imdbId?: string;
  title?: string;
  season?: number;
  episode?: number;
  absoluteEpisodeNumber?: number;
  language?: "sub" | "dub";
  preferredAudio?: string;
  timeoutMs?: number;
  resumeTime?: number;
  signal?: AbortSignal;
}

export interface AnimePlaybackRequest {
  anilistId: number | string;
  malId?: number | string;
  tmdbId?: number | string;
  title?: string;
  romajiTitle?: string;
  englishTitle?: string;
  nativeTitle?: string;
  synonyms?: string[];
  season?: number;
  episode: number;
  absoluteEpisodeNumber?: number;
  language?: "sub" | "dub";
  variant?: AnimePlaybackVariant;
  preferredAudio?: string;
  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;
  format?: string;
  mediaType?: "anime" | "movie";
  timeoutMs?: number;
  resumeTime?: number;
  signal?: AbortSignal;
}

export type AnimePlaybackVariant = "sub" | "dub" | "raw";
export type PlaybackControlLevel = "FULL_CONTROL" | "PARTIAL_CONTROL" | "EMBED_ONLY";
export type HotSwitchState =
  | "IDLE"
  | "RESOLVING_VARIANT"
  | "SWITCHING"
  | "SEEKING"
  | "RESUMING"
  | "READY"
  | "FAILED";

export interface ProviderCapabilities {
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime: boolean;
  supportsAnimeMovie?: boolean;
  supportsAnimeEpisode?: boolean;
  supportsHLS?: boolean;
  supportsDASH?: boolean;
  supportsMP4?: boolean;
  supportsIframe?: boolean;
  supportsEpisode?: boolean;
  supportsSubtitles?: boolean;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsRaw?: boolean;
  supportsEvents: boolean;
  requiresApiKey: boolean;
  hasCaptions: boolean;
  supportsResume?: boolean;
  supportsAudioTracks?: boolean;
  supportsMultipleAudio?: boolean;
  supportsAudioTrackSwitching?: boolean;
  supportsAudioTrackSwitch?: boolean;
  supportsSubtitleTracks?: boolean;
  supportsQualitySelection?: boolean;
  supportsNextEpisode?: boolean;
  supportsOrientation?: boolean;
  supportsSeekAfterLoad?: boolean;
  supportsResumeAfterSwitch?: boolean;
  controlLevel?: PlaybackControlLevel;
}

export interface PlaybackSource {
  providerId: string;
  providerName: string;
  type: "embed" | "hls" | "mp4" | "dash";
  url: string;
  available: boolean;
  priority: number;
  score?: number;
  quality?: string;
  statusText?: string;
  latencyMs?: number;
  mediaType?: "movie" | "tv" | "anime" | "video";
  mediaClass?: MediaClass;
  pool?: PlaybackPool;
  tmdbId?: number | string;
  anilistId?: number | string;
  malId?: number | string;
  imdbId?: string;
  season?: number;
  episode?: number;
  language?: "sub" | "dub";
  variant?: AnimePlaybackVariant;
  audioLanguage?: string;
  subtitleLanguage?: string;
  availableVariants?: AnimePlaybackVariant[];
  controlLevel?: PlaybackControlLevel;
  seekSupported?: boolean;
  resumeSupported?: boolean;
  serverLabel?: string;
  serverNumber?: number;
  expiresAt?: number;
  progressTrackingSupported?: boolean;
  status?: ContentPlaybackStatus;
  error?: string;
  verified?: boolean;
  subtitles?: { language: string; label: string; url: string }[];
  audioTracks?: { language: string; label: string; active?: boolean }[];
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
  // Pool-specific health separation
  generalHealth?: {
    totalSuccess: number;
    totalFailures: number;
    averageStartupMs: number;
    lastSuccess?: string;
  };
  animeHealth?: {
    totalSuccess: number;
    totalFailures: number;
    averageStartupMs: number;
    lastSuccess?: string;
  };
  variantHealth?: {
    subSuccess: number;
    subFailures: number;
    dubSuccess: number;
    dubFailures: number;
  };
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
  pools?: PlaybackPool[];
  circuitState?: "CLOSED" | "HALF_OPEN" | "OPEN";

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

  // Dedicated anime resolver method where implemented
  resolveAnime?(request: AnimePlaybackRequest): Promise<PlaybackCandidate | null>;

  // Backward compatibility properties & methods
  requiresApiKey?: boolean;
  supportsMovie?: boolean;
  supportsTV?: boolean;
  supportsAnime?: boolean;
  getMoviePlayback?(tmdbId: number | string): Promise<PlaybackSource | null>;
  getTVPlayback?(tmdbId: number | string, season: number, episode: number): Promise<PlaybackSource | null>;
  getAnimePlayback?(anilistId: number | string, episode: number): Promise<PlaybackSource | null>;
}

