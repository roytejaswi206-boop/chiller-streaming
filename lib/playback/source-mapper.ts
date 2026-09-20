/**
 * lib/playback/source-mapper.ts
 *
 * CHILLER PROVIDER SOURCE MAPPING LAYER
 *
 * Translates CHILLER media identity (TMDB / AniList) into authorized provider-specific sources.
 * Architecture:
 *   CHILLER MEDIA -> Provider Source Map -> Available Provider IDs -> Playback Resolver
 */

import { prisma } from "@/lib/prisma";
import { PlaybackCandidate, PlaybackRequest } from "./types";
import { getProviderDirectoryEntry } from "./provider-directory";

export interface MappedSourceRecord {
  id: string;
  mediaKey: string;
  providerId: string;
  providerMediaId: string;
  title?: string | null;
  season?: number | null;
  episode?: number | null;
  quality?: string | null;
  format?: string | null;
  status: string;
  expiresAt?: Date | null;
  customHeaders?: string | null;
  createdAt: Date;
}

/**
 * Builds standard canonical mediaKey for mapping
 */
export function buildMediaKey(
  mediaType: "movie" | "tv" | "anime",
  id: number | string,
  season?: number,
  episode?: number
): string {
  const normType = mediaType.toLowerCase();
  const cleanId = String(id).replace(/\D/g, "");

  if (normType === "movie") {
    return `movie:tmdb:${cleanId}`;
  }
  if (normType === "tv") {
    const s = season || 1;
    const e = episode || 1;
    return `tv:tmdb:${cleanId}:${s}:${e}`;
  }
  if (normType === "anime") {
    const ep = episode || 1;
    return `anime:anilist:${cleanId}:${ep}`;
  }
  return `${normType}:${cleanId}`;
}

/**
 * Retrieves all active, non-expired provider source mappings for a given PlaybackRequest.
 */
export async function getActiveMappedSources(
  request: PlaybackRequest
): Promise<MappedSourceRecord[]> {
  const id = request.anilistId || request.tmdbId;
  if (!id) return [];

  const mediaKey = buildMediaKey(
    request.mediaType,
    id,
    request.season,
    request.episode
  );

  try {
    const records = await prisma.providerSource.findMany({
      where: {
        mediaKey,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    // Filter out expired sources
    return records.filter((r) => !r.expiresAt || r.expiresAt > now);
  } catch (err) {
    console.error("[SOURCE_MAPPER_ERROR] Failed to fetch mapped sources:", err);
    return [];
  }
}

/**
 * Converts a database MappedSourceRecord into a playable PlaybackCandidate
 */
export function mapRecordToCandidate(
  record: MappedSourceRecord,
  request: PlaybackRequest
): PlaybackCandidate {
  const dir = getProviderDirectoryEntry(record.providerId);
  const providerName = dir ? dir.name : record.providerId.toUpperCase();
  const mediaId = record.providerMediaId;

  // Determine URL and format based on provider ID
  let url = mediaId;
  let type: "embed" | "hls" | "mp4" = "embed";

  if (record.format === "HLS" || mediaId.includes(".m3u8")) {
    type = "hls";
  } else if (record.format === "MP4" || mediaId.includes(".mp4")) {
    type = "mp4";
  }

  // Handle provider-specific embed URL construction when providerMediaId is an ID/code
  if (!mediaId.startsWith("http")) {
    switch (record.providerId) {
      case "filemoon":
        url = `https://filemoon.org/e/${mediaId}`;
        break;
      case "streamtape":
        url = `https://streamtape.com/e/${mediaId}`;
        break;
      case "vdohide":
        url = `https://vdohide.com/e/${mediaId}`;
        break;
      case "earnvids":
        url = `https://earnvids.com/e/${mediaId}`;
        break;
      case "dailymotion":
        const playerId = process.env.DAILYMOTION_PLAYER_ID || "x7s6f";
        url = `https://geo.dailymotion.com/player/${playerId}.html?video=${mediaId}&autoplay=true`;
        break;
      case "vidstream":
        url = `https://vidstream.pics/embed/${mediaId}`;
        break;
      case "vidstreaming":
        url = `https://vidstreaming.org/e/${mediaId}`;
        break;
      case "mycloud":
        url = `https://mycloud.click/embed/${mediaId}`;
        break;
      case "megacloud":
        url = `https://megacloud.tv/embed/${mediaId}`;
        break;
      default:
        url = mediaId;
    }
  }

  return {
    providerId: record.providerId,
    providerName,
    type,
    url,
    available: true,
    priority: dir?.defaultPriority || 50,
    quality: record.quality || "1080p HD",
    statusText: `${providerName} (Mapped Source)`,
    status: "CANDIDATE_FOUND",
    mediaType: request.mediaType,
    tmdbId: request.tmdbId,
    anilistId: request.anilistId,
    season: request.season,
    episode: request.episode,
    expiresAt: record.expiresAt ? record.expiresAt.getTime() : undefined,
    verified: true,
  };
}

/**
 * Upserts a source mapping in the database (used by Admin Source Mapping UI).
 */
export async function upsertSourceMapping(data: {
  mediaKey: string;
  providerId: string;
  providerMediaId: string;
  title?: string;
  season?: number;
  episode?: number;
  quality?: string;
  format?: string;
  status?: string;
  expiresAt?: Date | null;
}) {
  return prisma.providerSource.upsert({
    where: {
      mediaKey_providerId_providerMediaId: {
        mediaKey: data.mediaKey,
        providerId: data.providerId.toLowerCase().trim(),
        providerMediaId: data.providerMediaId.trim(),
      },
    },
    update: {
      title: data.title,
      season: data.season,
      episode: data.episode,
      quality: data.quality || "1080p HD",
      format: data.format || "EMBED",
      status: data.status || "ACTIVE",
      expiresAt: data.expiresAt,
    },
    create: {
      mediaKey: data.mediaKey,
      providerId: data.providerId.toLowerCase().trim(),
      providerMediaId: data.providerMediaId.trim(),
      title: data.title,
      season: data.season,
      episode: data.episode,
      quality: data.quality || "1080p HD",
      format: data.format || "EMBED",
      status: data.status || "ACTIVE",
      expiresAt: data.expiresAt,
    },
  });
}
