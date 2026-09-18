import { ExternalIds } from "./types";

class ContentIdMapper {
  private memoryCache: Map<string, ExternalIds> = new Map();

  private makeKey(type: string, id: string | number): string {
    return `${type}:${id}`;
  }

  registerIds(ids: ExternalIds) {
    const keys: string[] = [];
    if (ids.tmdbId) keys.push(this.makeKey("tmdb", ids.tmdbId));
    if (ids.imdbId) keys.push(this.makeKey("imdb", ids.imdbId));
    if (ids.anilistId) keys.push(this.makeKey("anilist", ids.anilistId));
    if (ids.malId) keys.push(this.makeKey("mal", ids.malId));
    if (ids.tvmazeId) keys.push(this.makeKey("tvmaze", ids.tvmazeId));
    if (ids.tvdbId) keys.push(this.makeKey("tvdb", ids.tvdbId));

    // Consolidate existing with new
    let consolidated: ExternalIds = { ...ids };
    for (const key of keys) {
      const existing = this.memoryCache.get(key);
      if (existing) {
        consolidated = { ...existing, ...consolidated };
      }
    }

    // Save consolidated mapping to all keys
    for (const key of keys) {
      this.memoryCache.set(key, consolidated);
    }
  }

  findIds(source: "tmdb" | "imdb" | "anilist" | "mal" | "tvmaze" | "tvdb", id: string | number): ExternalIds | null {
    const key = this.makeKey(source, id);
    return this.memoryCache.get(key) || null;
  }
}

export const idMapper = new ContentIdMapper();
