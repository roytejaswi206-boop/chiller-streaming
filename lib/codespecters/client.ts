import { getCodeSpecterApiKey } from "@/lib/settings";

const CODESPECTER_BASE_URL = "https://api.codespecters.com";

export interface CodeSpecterPlaybackOptions {
  tmdbId: number | string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

export interface CodeSpecterPlaybackResult {
  available: boolean;
  embedUrl?: string;
  provider: "codespecter";
  error?: string;
}

/**
 * Generate CodeSpecter embed playback URL adhering to documented contract:
 * Movie: https://api.codespecters.com/embed/movie/{tmdbId}?apikey={YOUR_KEY}
 * TV:    https://api.codespecters.com/embed/tv/{tmdbId}/{season}/{episode}?apikey={YOUR_KEY}
 */
export async function getCodeSpecterPlayback(
  options: CodeSpecterPlaybackOptions
): Promise<CodeSpecterPlaybackResult> {
  const apiKey = await getCodeSpecterApiKey();

  if (!apiKey) {
    return {
      available: false,
      provider: "codespecter",
      error: "Playback provider is not configured. Please add CODESPECTER_API_KEY.",
    };
  }

  const { tmdbId, type, season = 1, episode = 1 } = options;

  if (!tmdbId) {
    return {
      available: false,
      provider: "codespecter",
      error: "Invalid TMDB identifier for playback.",
    };
  }

  let embedUrl = "";
  if (type === "movie") {
    embedUrl = `${CODESPECTER_BASE_URL}/embed/movie/${tmdbId}?apikey=${encodeURIComponent(apiKey)}`;
  } else {
    embedUrl = `${CODESPECTER_BASE_URL}/embed/tv/${tmdbId}/${season}/${episode}?apikey=${encodeURIComponent(apiKey)}`;
  }

  return {
    available: true,
    embedUrl,
    provider: "codespecter",
  };
}

/**
 * Test connection to CodeSpecter service
 */
export async function testCodeSpecterConnection(customKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = customKey || (await getCodeSpecterApiKey());
    if (!apiKey) {
      return { success: false, message: "CodeSpecter API key is not configured." };
    }

    // Ping test movie endpoint
    const testUrl = `${CODESPECTER_BASE_URL}/embed/movie/550?apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(testUrl, { method: "HEAD" });

    if (res.ok || res.status === 200 || res.status === 302 || res.status === 301) {
      return { success: true, message: "Connected successfully to CodeSpecter playback service." };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: "CodeSpecter API key was rejected (unauthorized or domain locked)." };
    }

    return { success: true, message: `CodeSpecter endpoint responded with status ${res.status}.` };
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}
