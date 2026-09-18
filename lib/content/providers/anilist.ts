import { ChillerContent, ContentProvider, ContentProviderStatus, ContentType } from "../types";

export class AniListContentProvider implements ContentProvider {
  id = "anilist";
  name = "AniList (Anime Intelligence)";
  category = "anime" as const;
  enabled = process.env.ANILIST_ENABLED !== "false";
  requiresApiKey = false;
  priority = 2;

  private getEndpoint(): string {
    return process.env.ANILIST_API_URL?.trim() || "https://graphql.anilist.co";
  }

  private async queryGraphQL<T>(query: string, variables: Record<string, any> = {}): Promise<T | null> {
    try {
      const res = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Chiller/2.0 (Anime Intelligence)",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json.data as T;
    } catch {
      return null;
    }
  }

  async search(query: string): Promise<ChillerContent[]> {
    if (!this.enabled || !query.trim()) return [];

    const gql = `
      query SearchAnime($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            episodes
            status
            averageScore
            popularity
            genres
            season
            seasonYear
            startDate {
              year
              month
              day
            }
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.queryGraphQL<{ Page: { media: any[] } }>(gql, { search: query });
    if (!data?.Page?.media) return [];

    return data.Page.media.map((item) => this.mapMediaToContent(item));
  }

  async getAnime(id: number | string): Promise<ChillerContent | null> {
    if (!this.enabled) return null;

    const anilistId = Number(id);
    if (isNaN(anilistId)) return null;

    const gql = `
      query GetAnime($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
            extraLarge
          }
          bannerImage
          format
          episodes
          status
          averageScore
          popularity
          genres
          season
          seasonYear
          startDate {
            year
            month
            day
          }
          studios(isMain: true) {
            nodes {
              name
            }
          }
          characters(perPage: 6, sort: ROLE) {
            nodes {
              name {
                full
              }
              image {
                medium
              }
            }
          }
        }
      }
    `;

    const data = await this.queryGraphQL<{ Media: any }>(gql, { id: anilistId });
    if (!data?.Media) return null;

    return this.mapMediaToContent(data.Media);
  }

  private mapMediaToContent(item: any): ChillerContent {
    const title = item.title?.english || item.title?.romaji || item.title?.native || "Untitled Anime";
    const releaseDate = item.startDate?.year
      ? `${item.startDate.year}-${String(item.startDate.month || 1).padStart(2, "0")}-${String(item.startDate.day || 1).padStart(2, "0")}`
      : "";

    return {
      id: `anilist-anime-${item.id}`,
      type: "anime",
      title,
      originalTitle: item.title?.native,
      alternativeTitles: [item.title?.romaji, item.title?.english, item.title?.native].filter(Boolean) as string[],
      overview: item.description?.replace(/<[^>]*>/g, "") || "No overview available.",
      posterUrl: item.coverImage?.extraLarge || item.coverImage?.large || "/placeholder-poster.png",
      backdropUrl: item.bannerImage || item.coverImage?.extraLarge || "",
      releaseDate,
      year: item.seasonYear ? String(item.seasonYear) : item.startDate?.year ? String(item.startDate.year) : "",
      genres: item.genres || [],
      languages: ["Japanese"],
      originalLanguage: "ja",
      country: "Japan",
      rating: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : 0,
      popularity: item.popularity,
      externalIds: {
        anilistId: item.id,
        malId: item.idMal,
      },
      romajiTitle: item.title?.romaji,
      englishTitle: item.title?.english,
      nativeTitle: item.title?.native,
      format: item.format,
      status: item.status,
      studios: item.studios?.nodes?.map((s: any) => s.name) || [],
      animeSeason: item.season ? `${item.season} ${item.seasonYear || ""}`.trim() : undefined,
      totalEpisodes: item.episodes,
      characters: item.characters?.nodes?.map((c: any) => ({
        name: c.name?.full || "Character",
        imageUrl: c.image?.medium,
      })),
      primarySource: "anilist",
      enrichedSources: ["anilist"],
      lastUpdated: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<{
    status: ContentProviderStatus;
    latencyMs?: number;
    message?: string;
  }> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "AniList provider is disabled." };
    }

    const start = Date.now();
    try {
      const q = "query { Page(page: 1, perPage: 1) { media(type: ANIME) { id } } }";
      const res = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: q }),
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          status: "ACTIVE",
          latencyMs,
          message: `Operational (GraphQL ${latencyMs}ms)`,
        };
      }
      return {
        status: "DEGRADED",
        latencyMs,
        message: `Returned HTTP status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: "FAILED",
        latencyMs: Date.now() - start,
        message: err.message || "Failed to reach AniList GraphQL",
      };
    }
  }
}
