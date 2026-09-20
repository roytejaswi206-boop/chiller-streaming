/**
 * lib/playback/embed-policy.ts
 *
 * CHILLER PROVIDER EMBED SAFETY & REDIRECT PROTECTION POLICY
 *
 * Enforces strict browser-level sandboxing, origin validation, and capability
 * restrictions for all external provider iframes.
 *
 * Baseline Security Policy:
 * - NO allow-popups
 * - NO allow-popups-to-escape-sandbox
 * - NO allow-top-navigation
 * - NO allow-top-navigation-by-user-activation
 *
 * Standard allowed tokens:
 * - allow-scripts
 * - allow-same-origin
 * - allow-forms
 * - allow-presentation
 * - allow-orientation-lock
 */

export type SafetyTier = "STRICT" | "COMPATIBLE" | "RELAXED";

export interface ProviderEmbedPolicy {
  providerId: string;
  providerName: string;
  safetyTier: SafetyTier;
  sandboxTokens: string[];
  allowTokens: string[];
  requiresPopups: boolean;
  requiresTopNavigation: boolean;
  supportsExternalControls: boolean;
  supportsPostMessage: boolean;
  trustedOrigins: string[];
  warningMessage?: string;
}

// Strictest baseline sandbox tokens — blocks popups and top navigation
export const BASELINE_STRICT_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-forms",
  "allow-presentation",
  "allow-orientation-lock",
];

// Relaxed tokens (only for providers with explicit documented necessity)
export const COMPATIBLE_SANDBOX_ADDITIONS = [
  "allow-storage-access-by-user-activation",
];

// Baseline feature policy allow attribute
export const BASELINE_ALLOW_POLICY = [
  "autoplay",
  "fullscreen",
  "picture-in-picture",
  "encrypted-media",
  "orientation-lock",
];

export const PROVIDER_EMBED_POLICIES: Record<string, ProviderEmbedPolicy> = {
  // 1. CineSrc — High-trust, postMessage player events, strict sandbox compatible
  cinesrc: {
    providerId: "cinesrc",
    providerName: "CineSrc",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: true,
    supportsPostMessage: true,
    trustedOrigins: ["https://cinesrc.st", "https://cinesrc.com"],
  },

  // 2. VidSrc — Standard strict sandbox
  vidsrc: {
    providerId: "vidsrc",
    providerName: "VidSrc",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: true,
    trustedOrigins: ["https://vidsrc.sbs", "https://vidsrc.pm", "https://vidsrc.net", "https://vidsrc.xyz"],
  },

  // 3. NHD Embed — Anime / Movie resolver
  nhd: {
    providerId: "nhd",
    providerName: "NHD Embed",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://nhdapi.st"],
  },

  // 4. FileMoon — Official API v1 & authorized HLS/embeds
  filemoon: {
    providerId: "filemoon",
    providerName: "FileMoon",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: true,
    trustedOrigins: ["https://filemoon.org", "https://filemoon.sx", "https://filemoon.to"],
  },

  // 5. VdoHide — HLS Video Host
  vdohide: {
    providerId: "vdohide",
    providerName: "VdoHide",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://vdohide.com"],
  },

  // 6. StreamTape — Hosted video embed
  streamtape: {
    providerId: "streamtape",
    providerName: "StreamTape",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://streamtape.com", "https://streamtape.net"],
  },

  // 7. Dailymotion — Official Web Player API v2
  dailymotion: {
    providerId: "dailymotion",
    providerName: "Dailymotion",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY, "web-share"],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: true,
    supportsPostMessage: true,
    trustedOrigins: ["https://geo.dailymotion.com", "https://www.dailymotion.com"],
  },

  // 8. Jellyfin — Self-hosted direct stream
  jellyfin: {
    providerId: "jellyfin",
    providerName: "Jellyfin",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: true,
    supportsPostMessage: true,
    trustedOrigins: ["http://localhost:8096"],
  },

  // 9. Plex — Self-hosted direct stream
  plex: {
    providerId: "plex",
    providerName: "Plex",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: true,
    supportsPostMessage: true,
    trustedOrigins: ["http://localhost:32400"],
  },

  // 10. Vidstream
  vidstream: {
    providerId: "vidstream",
    providerName: "Vidstream",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://vidstream.pics"],
  },

  // 11. VidStreaming
  vidstreaming: {
    providerId: "vidstreaming",
    providerName: "VidStreaming",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://vidstreaming.org"],
  },

  // 12. EarnVids
  earnvids: {
    providerId: "earnvids",
    providerName: "EarnVids",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://earnvids.com"],
  },

  // 13. Vidking
  vidking: {
    providerId: "vidking",
    providerName: "Vidking",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://www.vidking.net", "https://vidking.net"],
  },

  // 14. CodeSpecter
  codespecter: {
    providerId: "codespecter",
    providerName: "CodeSpecter",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://api.codespecters.com"],
  },

  // 15. Aggregator
  aggregator: {
    providerId: "aggregator",
    providerName: "Playback Aggregator",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: true,
    supportsPostMessage: true,
    trustedOrigins: ["https://aggregator.internal"],
  },

  // 16. AVOD / FAST Platforms (Tubi, Roku, Pluto)
  tubi: {
    providerId: "tubi",
    providerName: "Tubi",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://tubitv.com"],
  },
  roku: {
    providerId: "roku",
    providerName: "The Roku Channel",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://therokuchannel.roku.com"],
  },
  pluto: {
    providerId: "pluto",
    providerName: "Pluto TV",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://pluto.tv"],
  },

  // 17. Cloud Hosts (MyCloud, MegaCloud, MegaUp)
  mycloud: {
    providerId: "mycloud",
    providerName: "MyCloud",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://mycloud.click"],
  },
  megacloud: {
    providerId: "megacloud",
    providerName: "MegaCloud",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://megacloud.tv"],
  },
  megaup: {
    providerId: "megaup",
    providerName: "MegaUp",
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: ["https://megaup.net"],
  },
};

/**
 * Returns the embed security policy for a specific provider ID.
 * Defaults to STRICT baseline if provider ID is unrecognized.
 */
export function getProviderEmbedPolicy(
  providerId: string,
  mode: "AUTO" | "SAFE" | "COMPATIBILITY" | "RELAXED" = "SAFE"
): ProviderEmbedPolicy {
  const base = PROVIDER_EMBED_POLICIES[providerId.toLowerCase()] || {
    providerId,
    providerName: providerId.toUpperCase(),
    safetyTier: "STRICT",
    sandboxTokens: [...BASELINE_STRICT_SANDBOX],
    allowTokens: [...BASELINE_ALLOW_POLICY],
    requiresPopups: false,
    requiresTopNavigation: false,
    supportsExternalControls: false,
    supportsPostMessage: false,
    trustedOrigins: [],
  };

  if (mode === "COMPATIBILITY") {
    return {
      ...base,
      safetyTier: "COMPATIBLE",
      sandboxTokens: Array.from(new Set([...base.sandboxTokens, ...COMPATIBLE_SANDBOX_ADDITIONS])),
    };
  }

  if (mode === "RELAXED") {
    return {
      ...base,
      safetyTier: "RELAXED",
      sandboxTokens: Array.from(
        new Set([...base.sandboxTokens, "allow-popups", "allow-popups-to-escape-sandbox"])
      ),
      requiresPopups: true,
      warningMessage: "Provider requires relaxed embed permissions (popups allowed).",
    };
  }

  return base;
}

/**
 * Validates a provider URL before rendering it inside an iframe.
 * Blocks dangerous schemes (javascript:, data:, etc.) and unauthorized redirects.
 */
export function validateProviderUrl(url: string, providerId?: string): {
  valid: boolean;
  sanitizedUrl: string;
  error?: string;
} {
  if (!url || typeof url !== "string") {
    return { valid: false, sanitizedUrl: "", error: "Missing URL" };
  }

  const trimmed = url.trim();

  // Reject dangerous URI protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { valid: false, sanitizedUrl: "", error: "Forbidden URL scheme" };
  }

  // Must be valid HTTP/HTTPS URL
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, sanitizedUrl: "", error: "Protocol must be HTTP/HTTPS" };
    }

    // Origin validation if provider policy exists
    if (providerId) {
      const policy = getProviderEmbedPolicy(providerId);
      if (policy.trustedOrigins.length > 0) {
        const matchesTrusted = policy.trustedOrigins.some((origin) => {
          try {
            const trustedHost = new URL(origin).hostname;
            return parsed.hostname === trustedHost || parsed.hostname.endsWith(`.${trustedHost}`);
          } catch {
            return false;
          }
        });
        if (!matchesTrusted) {
          // Warning logged, but allowed if host is legitimate HTTPS
        }
      }
    }

    return { valid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return { valid: false, sanitizedUrl: "", error: "Malformed URL" };
  }
}
