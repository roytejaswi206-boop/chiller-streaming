/**
 * lib/playback/provider-directory.ts
 *
 * CHILLER OFFICIAL PROVIDER SOURCE DIRECTORY & DOCUMENTATION REGISTRY
 *
 * Authoritative registry of all candidate playback services, documented endpoints,
 * integration types, authentication models, and capability profiles.
 *
 * NEVER store secrets, tokens, or passwords in this registry.
 */

export type ProviderCategory =
  | "VIDEO_HOST"      // Hosted video storage / streaming (FileMoon, VdoHide, StreamTape, EarnVids, etc.)
  | "SELF_HOSTED"     // User/Admin managed media servers (Jellyfin, Plex)
  | "PLATFORM"        // Licensed / FAST / Video platforms (Dailymotion, Tubi, Pluto, Roku)
  | "EMBED_RESOLVER"; // Multi-source metadata-driven stream resolvers (CineSrc, NHD, VidSrc, Vidking)

export type ProviderAuthType =
  | "BEARER_TOKEN"
  | "API_KEY"
  | "LOGIN_KEY"
  | "PLAYER_ID"
  | "NONE"
  | "CUSTOM";

export type ProviderIntegrationType =
  | "REST_API_V1"
  | "REST_API_V2"
  | "PLAYER_SDK"
  | "DIRECT_HLS"
  | "IFRAME_EMBED"
  | "SOURCE_MAPPED";

export interface ProviderDirectoryEntry {
  id: string;
  name: string;
  category: ProviderCategory;
  referenceUrl: string;
  docsUrl: string;
  officialDomain: string;
  integrationType: ProviderIntegrationType;
  authType: ProviderAuthType;
  envFlag: string;
  defaultPriority: number;
  description: string;
  capabilities: {
    supportsMovie: boolean;
    supportsTV: boolean;
    supportsEpisode: boolean;
    supportsAnime: boolean;
    supportsHLS: boolean;
    supportsMP4: boolean;
    supportsIframe: boolean;
    supportsSubtitles: boolean;
    supportsAudio: boolean;
    supportsQuality: boolean;
    supportsResume: boolean;
    supportsSeek: boolean;
    requiresApiKey: boolean;
    requiresSourceMapping: boolean; // Needs explicit Admin Source Map or API catalog search
  };
}

export const PROVIDER_DIRECTORY: Record<string, ProviderDirectoryEntry> = {
  // ============================================================================
  // A. EARNVIDS
  // ============================================================================
  earnvids: {
    id: "earnvids",
    name: "EarnVids",
    category: "VIDEO_HOST",
    referenceUrl: "https://earnvids.com/dashboard",
    docsUrl: "https://earnvids.com/api",
    officialDomain: "https://earnvids.com",
    integrationType: "IFRAME_EMBED",
    authType: "API_KEY",
    envFlag: "EARNVIDS_ENABLED",
    defaultPriority: 25,
    description: "Cloud video hosting & streaming service with embeddable playback player.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // B. VIDSTREAM.PICS
  // ============================================================================
  vidstream: {
    id: "vidstream",
    name: "Vidstream",
    category: "VIDEO_HOST",
    referenceUrl: "https://vidstream.pics/",
    docsUrl: "https://vidstream.pics/",
    officialDomain: "https://vidstream.pics",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "VIDSTREAM_ENABLED",
    defaultPriority: 26,
    description: "Streaming video source supporting direct embed and HLS video delivery.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // C. VIDSTREAMING.ORG
  // ============================================================================
  vidstreaming: {
    id: "vidstreaming",
    name: "VidStreaming",
    category: "VIDEO_HOST",
    referenceUrl: "https://vidstreaming.org/",
    docsUrl: "https://vidstreaming.org/login",
    officialDomain: "https://vidstreaming.org",
    integrationType: "IFRAME_EMBED",
    authType: "API_KEY",
    envFlag: "VIDSTREAMING_ENABLED",
    defaultPriority: 27,
    description: "High-performance video hosting platform with embeddable streaming players.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // D. VDOHIDE
  // ============================================================================
  vdohide: {
    id: "vdohide",
    name: "VdoHide",
    category: "VIDEO_HOST",
    referenceUrl: "https://vdohide.com/",
    docsUrl: "https://vdohide.com/api",
    officialDomain: "https://vdohide.com",
    integrationType: "DIRECT_HLS",
    authType: "API_KEY",
    envFlag: "VDOHIDE_ENABLED",
    defaultPriority: 20,
    description: "HLS video hosting service with unlimited bandwidth, multi-bitrate delivery, and subtitles.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // E. STREAMTAPE
  // ============================================================================
  streamtape: {
    id: "streamtape",
    name: "StreamTape",
    category: "VIDEO_HOST",
    referenceUrl: "https://streamtape.com/login",
    docsUrl: "https://api.streamtape.com",
    officialDomain: "https://streamtape.com",
    integrationType: "REST_API_V1",
    authType: "LOGIN_KEY",
    envFlag: "STREAMTAPE_ENABLED",
    defaultPriority: 22,
    description: "Cloud video hosting platform with documented API for file info, download tickets, and player embeds.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // F. FILEMOON
  // ============================================================================
  filemoon: {
    id: "filemoon",
    name: "FileMoon",
    category: "VIDEO_HOST",
    referenceUrl: "https://filemoon.org/en/login",
    docsUrl: "https://filemoon.org/en/api-docs",
    officialDomain: "https://filemoon.org",
    integrationType: "REST_API_V1",
    authType: "BEARER_TOKEN",
    envFlag: "FILEMOON_ENABLED",
    defaultPriority: 15,
    description: "Documented API v1 video platform with Bearer auth, file inspection, HLS encoding status, and iframe embedding.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // G. JELLYFIN (Self-Hosted)
  // ============================================================================
  jellyfin: {
    id: "jellyfin",
    name: "Jellyfin",
    category: "SELF_HOSTED",
    referenceUrl: "https://jellyfin.org/",
    docsUrl: "https://api.jellyfin.org/",
    officialDomain: "https://jellyfin.org",
    integrationType: "DIRECT_HLS",
    authType: "API_KEY",
    envFlag: "JELLYFIN_ENABLED",
    defaultPriority: 5, // High priority when configured (private ownership)
    description: "Self-hosted media system providing direct HLS transcodes, original bitrate streams, and multi-track audio.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: false,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // H. PLEX (Self-Hosted)
  // ============================================================================
  plex: {
    id: "plex",
    name: "Plex",
    category: "SELF_HOSTED",
    referenceUrl: "https://www.plex.tv/",
    docsUrl: "https://www.plex.tv/media-server-software/",
    officialDomain: "https://plex.tv",
    integrationType: "DIRECT_HLS",
    authType: "BEARER_TOKEN",
    envFlag: "PLEX_ENABLED",
    defaultPriority: 6,
    description: "Self-hosted Plex Media Server integration providing direct universal transcode streams.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: false,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // I. DAILYMOTION
  // ============================================================================
  dailymotion: {
    id: "dailymotion",
    name: "Dailymotion",
    category: "PLATFORM",
    referenceUrl: "https://www.dailymotion.com",
    docsUrl: "https://developers.dailymotion.com/",
    officialDomain: "https://dailymotion.com",
    integrationType: "REST_API_V2",
    authType: "PLAYER_ID",
    envFlag: "DAILYMOTION_ENABLED",
    defaultPriority: 18,
    description: "Official Dailymotion API v2 and Web Player integration with event telemetry.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // J. TUBI
  // ============================================================================
  tubi: {
    id: "tubi",
    name: "Tubi",
    category: "PLATFORM",
    referenceUrl: "https://tubitv.com",
    docsUrl: "https://corporate.tubitv.com",
    officialDomain: "https://tubitv.com",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "TUBI_ENABLED",
    defaultPriority: 30,
    description: "Ad-supported licensed streaming catalog source.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: false,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // K. THE ROKU CHANNEL
  // ============================================================================
  roku: {
    id: "roku",
    name: "The Roku Channel",
    category: "PLATFORM",
    referenceUrl: "https://therokuchannel.roku.com",
    docsUrl: "https://developer.roku.com",
    officialDomain: "https://roku.com",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "ROKU_ENABLED",
    defaultPriority: 31,
    description: "Roku Channel streaming video source.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: false,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // L. PLUTO TV
  // ============================================================================
  pluto: {
    id: "pluto",
    name: "Pluto TV",
    category: "PLATFORM",
    referenceUrl: "https://pluto.tv",
    docsUrl: "https://pluto.tv",
    officialDomain: "https://pluto.tv",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "PLUTO_ENABLED",
    defaultPriority: 32,
    description: "FAST ad-supported linear and on-demand streaming service.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // M. MYCLOUD
  // ============================================================================
  mycloud: {
    id: "mycloud",
    name: "MyCloud",
    category: "VIDEO_HOST",
    referenceUrl: "https://mycloud.click",
    docsUrl: "https://mycloud.click",
    officialDomain: "https://mycloud.click",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "MYCLOUD_ENABLED",
    defaultPriority: 28,
    description: "Cloud video hosting & embed delivery service.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // N. MEGAUP
  // ============================================================================
  megaup: {
    id: "megaup",
    name: "MegaUp",
    category: "VIDEO_HOST",
    referenceUrl: "https://megaup.net",
    docsUrl: "https://megaup.net",
    officialDomain: "https://megaup.net",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "MEGAUP_ENABLED",
    defaultPriority: 29,
    description: "High-capacity file and video hosting service.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: false,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: false,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // O. MEGACLOUD
  // ============================================================================
  megacloud: {
    id: "megacloud",
    name: "MegaCloud",
    category: "VIDEO_HOST",
    referenceUrl: "https://megacloud.tv",
    docsUrl: "https://megacloud.tv",
    officialDomain: "https://megacloud.tv",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "MEGACLOUD_ENABLED",
    defaultPriority: 24,
    description: "Fast multi-bitrate HLS and embed video delivery service.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: true,
    },
  },

  // ============================================================================
  // EXISTING METADATA-DIRECT RESOLVERS
  // ============================================================================
  cinesrc: {
    id: "cinesrc",
    name: "CineSrc",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://cinesrc.st",
    docsUrl: "https://cinesrc.st",
    officialDomain: "https://cinesrc.st",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "CINESRC_ENABLED",
    defaultPriority: 1,
    description: "Primary metadata-driven movie, TV, and anime embed stream provider.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: false,
    },
  },

  nhd: {
    id: "nhd",
    name: "NHD Player",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://nhdapi.st",
    docsUrl: "https://nhdapi.st",
    officialDomain: "https://nhdapi.st",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "NHD_ENABLED",
    defaultPriority: 2,
    description: "High-definition multi-source movie and series embed provider.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: false,
    },
  },

  vidsrc: {
    id: "vidsrc",
    name: "VidSrc",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://vidsrc.sbs",
    docsUrl: "https://vidsrc.sbs",
    officialDomain: "https://vidsrc.sbs",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "VIDSRC_ENABLED",
    defaultPriority: 3,
    description: "Widely supported streaming embed network.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: false,
    },
  },

  vidking: {
    id: "vidking",
    name: "Vidking",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://vidking.net",
    docsUrl: "https://vidking.net",
    officialDomain: "https://vidking.net",
    integrationType: "IFRAME_EMBED",
    authType: "NONE",
    envFlag: "VIDKING_ENABLED",
    defaultPriority: 4,
    description: "Fast-loading lightweight embed player.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: false,
      supportsIframe: true,
      supportsSubtitles: false,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: false,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: false,
    },
  },

  codespecter: {
    id: "codespecter",
    name: "CodeSpecter",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://api.codespecter.net",
    docsUrl: "https://api.codespecter.net",
    officialDomain: "https://api.codespecter.net",
    integrationType: "REST_API_V1",
    authType: "API_KEY",
    envFlag: "CODESPECTER_ENABLED",
    defaultPriority: 10,
    description: "API-driven playback aggregation and multi-CDN stream resolver.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: true,
      requiresSourceMapping: false,
    },
  },

  aggregator: {
    id: "aggregator",
    name: "Playback Aggregator",
    category: "EMBED_RESOLVER",
    referenceUrl: "https://aggregator.internal",
    docsUrl: "https://aggregator.internal",
    officialDomain: "https://aggregator.internal",
    integrationType: "REST_API_V1",
    authType: "BEARER_TOKEN",
    envFlag: "PLAYBACK_AGGREGATOR_ENABLED",
    defaultPriority: 12,
    description: "Self-hosted high-availability stream aggregator.",
    capabilities: {
      supportsMovie: true,
      supportsTV: true,
      supportsEpisode: true,
      supportsAnime: true,
      supportsHLS: true,
      supportsMP4: true,
      supportsIframe: true,
      supportsSubtitles: true,
      supportsAudio: true,
      supportsQuality: true,
      supportsResume: true,
      supportsSeek: true,
      requiresApiKey: false,
      requiresSourceMapping: false,
    },
  },
};

/**
 * Returns metadata directory entry for a given provider ID.
 */
export function getProviderDirectoryEntry(providerId: string): ProviderDirectoryEntry | undefined {
  return PROVIDER_DIRECTORY[providerId.toLowerCase()];
}

/**
 * Returns all registered directory entries.
 */
export function getAllProviderDirectoryEntries(): ProviderDirectoryEntry[] {
  return Object.values(PROVIDER_DIRECTORY).sort((a, b) => a.defaultPriority - b.defaultPriority);
}
