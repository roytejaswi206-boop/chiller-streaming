/**
 * CHILLER ENTERTAINMENT NEWS PROVIDER (OPTIONAL)
 * 
 * Strict policy:
 * Only display actual articles if ENTERTAINMENT_NEWS_ENABLED=true and a real provider is configured.
 * Never fabricate fake articles or mock headlines.
 */

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
  summary?: string;
}

export interface NewsProvider {
  id: string;
  name: string;
  isEnabled(): boolean;
  getLatestUpdates(limit?: number): Promise<NewsArticle[]>;
}

class ConfiguredNewsProvider implements NewsProvider {
  id = "entertainment-news";
  name = "Entertainment News Feed";

  isEnabled(): boolean {
    return (
      process.env.ENTERTAINMENT_NEWS_ENABLED === "true" &&
      Boolean(process.env.ENTERTAINMENT_NEWS_API_URL?.trim())
    );
  }

  async getLatestUpdates(limit = 10): Promise<NewsArticle[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const apiUrl = process.env.ENTERTAINMENT_NEWS_API_URL!.trim();
      const apiKey = process.env.ENTERTAINMENT_NEWS_API_KEY?.trim();

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "Chiller/2.0 (News Feed)",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${apiUrl}?limit=${limit}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const json = await res.json();

      // Normalize if standard RSS/JSON feed
      const rawArticles = Array.isArray(json.articles) ? json.articles : Array.isArray(json) ? json : [];
      return rawArticles.slice(0, limit).map((a: any, idx: number) => ({
        id: a.id || a.url || `news-${idx}`,
        title: a.title || "Entertainment Update",
        source: a.source?.name || a.source || "Feed",
        url: a.url || "#",
        publishedAt: a.publishedAt || new Date().toISOString(),
        imageUrl: a.urlToImage || a.imageUrl,
        summary: a.description || a.summary,
      }));
    } catch {
      return [];
    }
  }
}

export const entertainmentNewsProvider: NewsProvider = new ConfiguredNewsProvider();
