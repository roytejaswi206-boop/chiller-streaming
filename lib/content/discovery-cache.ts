/**
 * CHILLER DISCOVERY CACHE ENGINE
 * Multi-tier TTL in-memory caching with in-flight request deduplication and metrics tracking
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  provider: string;
  createdAt: number;
  queryKey: string;
  itemCount: number;
}

export interface CacheMetrics {
  totalRequests: number;
  hits: number;
  misses: number;
  inFlightDeduplications: number;
  providerErrors: number;
  providerFallbacks: number;
  totalEntries: number;
  latency: {
    avgMs: number;
  };
  recentQueries: Array<{
    queryKey: string;
    provider: string;
    status: "HIT" | "MISS" | "IN_FLIGHT_DEDUP";
    latencyMs: number;
    itemCount: number;
    timestamp: number;
  }>;
}

class DiscoveryCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  // Metrics
  private metrics: Omit<CacheMetrics, "latency"> = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    inFlightDeduplications: 0,
    providerErrors: 0,
    providerFallbacks: 0,
    totalEntries: 0,
    recentQueries: [],
  };

  /**
   * Normalize query object or key deterministically
   */
  normalizeKey(prefix: string, params: Record<string, any> = {}): string {
    const sortedKeys = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
      .sort();
    const pairs = sortedKeys.map((k) => `${k}=${String(params[k]).toLowerCase().trim()}`);
    return `${prefix}:${pairs.join("&")}`;
  }

  generateKey(params: Record<string, any> = {}): string {
    return this.normalizeKey("discovery", params);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Determine TTL in seconds based on category or query prefix
   */
  getTtlSeconds(category?: string): number {
    const cat = (category || "").toLowerCase();
    if (cat.includes("trending")) return 300; // 5 min
    if (cat.includes("popular") || cat.includes("airing") || cat.includes("now_playing")) return 600; // 10 min
    if (cat.includes("genre") || cat.includes("discover") || cat.includes("drama") || cat.includes("kids")) return 1800; // 30 min
    if (cat.includes("search")) return 300; // 5 min
    return 1800; // default 30 min
  }

  /**
   * Wrap an async provider fetcher with in-flight deduplication and TTL caching
   */
  async getOrFetch<T>(
    key: string,
    providerName: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<{ data: T; source: "HIT" | "MISS" | "IN_FLIGHT_DEDUP"; latencyMs: number }> {
    this.metrics.totalRequests++;
    const now = Date.now();

    // 1. Check TTL Cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      this.metrics.hits++;
      const latencyMs = Date.now() - now;
      this.recordQueryLog(key, providerName, "HIT", latencyMs, cached.itemCount);
      return { data: cached.data as T, source: "HIT", latencyMs };
    }

    // 2. In-flight request deduplication
    if (this.inFlight.has(key)) {
      this.metrics.inFlightDeduplications++;
      const startInFlight = Date.now();
      const inFlightData = await this.inFlight.get(key)!;
      const latencyMs = Date.now() - startInFlight;
      const count = Array.isArray(inFlightData?.items) ? inFlightData.items.length : 1;
      this.recordQueryLog(key, providerName, "IN_FLIGHT_DEDUP", latencyMs, count);
      return { data: inFlightData as T, source: "IN_FLIGHT_DEDUP", latencyMs };
    }

    // 3. Cache MISS -> Fetch from provider
    this.metrics.misses++;
    const fetchStart = Date.now();

    const promise = (async () => {
      try {
        const data = await fetcher();
        const itemCount = Array.isArray((data as any)?.items) ? (data as any).items.length : 1;
        this.cache.set(key, {
          data,
          expiresAt: Date.now() + ttlSeconds * 1000,
          provider: providerName,
          createdAt: Date.now(),
          queryKey: key,
          itemCount,
        });
        this.metrics.totalEntries = this.cache.size;
        return data;
      } catch (err) {
        this.metrics.providerErrors++;
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);

    try {
      const data = await promise;
      const latencyMs = Date.now() - fetchStart;
      const itemCount = Array.isArray((data as any)?.items) ? (data as any).items.length : 1;
      this.recordQueryLog(key, providerName, "MISS", latencyMs, itemCount);
      return { data, source: "MISS", latencyMs };
    } catch (error) {
      throw error;
    }
  }

  recordFallback(provider: string) {
    this.metrics.providerFallbacks++;
  }

  recordError(provider: string) {
    this.metrics.providerErrors++;
  }

  private recordQueryLog(
    queryKey: string,
    provider: string,
    status: "HIT" | "MISS" | "IN_FLIGHT_DEDUP",
    latencyMs: number,
    itemCount: number
  ) {
    this.metrics.recentQueries.unshift({
      queryKey,
      provider,
      status,
      latencyMs,
      itemCount,
      timestamp: Date.now(),
    });
    // Keep max 50 recent queries
    if (this.metrics.recentQueries.length > 50) {
      this.metrics.recentQueries.pop();
    }
  }

  getMetrics(): CacheMetrics {
    const totalLatency = this.metrics.recentQueries.reduce((acc, q) => acc + q.latencyMs, 0);
    const avgMs = this.metrics.recentQueries.length > 0 ? totalLatency / this.metrics.recentQueries.length : 0;
    return {
      ...this.metrics,
      totalEntries: this.cache.size,
      latency: {
        avgMs: Number(avgMs.toFixed(1)),
      },
    };
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
    this.metrics.totalEntries = 0;
  }
}

export const discoveryCache = new DiscoveryCacheEngine();
