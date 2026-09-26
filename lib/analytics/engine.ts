/**
 * lib/analytics/engine.ts
 *
 * CHILLER First-Party Production Analytics & Telemetry Engine
 *
 * STRICT PRODUCTION RULES:
 * 1. REAL DATA ONLY — Absolutely zero fake/mock/random numbers.
 * 2. If no data exists, return 0 or null ("No comparison data" / "No data available yet").
 * 3. Privacy-conscious: Zero passwords, zero auth tokens, zero raw IPs exposed.
 * 4. Dual isolated playback pools: Anime Pool vs General Pool.
 * 5. Aggregations never block public streaming performance.
 */

import { prisma } from "@/lib/prisma";
import { playbackRegistry } from "@/lib/playback/registry";
import { providerHealthCache } from "@/lib/playback/health-cache";

export interface AnalyticsDateRange {
  range: "today" | "yesterday" | "7d" | "14d" | "30d" | "90d" | "custom";
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  isHourly: boolean;
}

export interface MetricComparison {
  current: number;
  previous: number;
  changePct: number | null; // null means no comparison data available
  trend: "up" | "down" | "flat" | "none";
}

export interface TopContentItem {
  id: string;
  mediaKey: string;
  title: string;
  mediaType: "movie" | "tv" | "anime";
  views: number;
  watchStarts: number;
  watchSeconds: number;
  completionRate: number;
  uniqueViewers: number;
  thumbnailUrl?: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  label: string;
  visitors: number;
  pageViews: number;
  sessions: number;
  watchStarts: number;
  watchSeconds: number;
  registrations: number;
}

export interface ProviderHealthReport {
  id: string;
  name: string;
  pool: "GENERAL" | "ANIME";
  enabled: boolean;
  priority: number;
  status: string;
  totalAttempts: number;
  totalSuccess: number;
  totalFailures: number;
  successRate: number | null;
  avgLatencyMs: number;
  lastError?: string | null;
  lastChecked?: string | null;
}

export interface GroupedErrorItem {
  signature: string;
  service: string;
  level: string;
  message: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  sampleMetadata?: string | null;
}

export interface LiveActivityEvent {
  id: string;
  type: string;
  description: string;
  mediaType?: string | null;
  mediaTitle?: string | null;
  actor: string;
  timestamp: string;
  device?: string;
}

/**
 * Calculates date bounds for the requested analytics range.
 * Always computed cleanly in UTC.
 */
export function computeAnalyticsDateRange(
  range: string = "today",
  customStart?: string,
  customEnd?: string
): AnalyticsDateRange {
  const now = new Date();

  if (range === "custom" && customStart && customEnd) {
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const isHourly = durationMs <= 48 * 60 * 60 * 1000;
    return { range: "custom", startDate, endDate, prevStartDate, prevEndDate, isHourly };
  }

  if (range === "yesterday") {
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const startDate = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endDate = new Date(startOfToday.getTime() - 1);
    const prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime() - 1);
    return { range: "yesterday", startDate, endDate, prevStartDate, prevEndDate, isHourly: true };
  }

  if (range === "7d") {
    const endDate = now;
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { range: "7d", startDate, endDate, prevStartDate, prevEndDate, isHourly: false };
  }

  if (range === "14d") {
    const endDate = now;
    const startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { range: "14d", startDate, endDate, prevStartDate, prevEndDate, isHourly: false };
  }

  if (range === "30d") {
    const endDate = now;
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { range: "30d", startDate, endDate, prevStartDate, prevEndDate, isHourly: false };
  }

  if (range === "90d") {
    const endDate = now;
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { range: "90d", startDate, endDate, prevStartDate, prevEndDate, isHourly: false };
  }

  // Default: "today"
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endDate = now;
  const prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevEndDate = new Date(startDate.getTime() - 1);
  return { range: "today", startDate, endDate, prevStartDate, prevEndDate, isHourly: true };
}

/**
 * Calculates honest percentage change without fabricating numbers.
 */
export function calculateComparison(current: number, previous: number): MetricComparison {
  if (previous === 0) {
    if (current === 0) {
      return { current, previous, changePct: 0, trend: "flat" };
    }
    // If previous period had no data, do NOT fabricate an infinite/fake percent
    return { current, previous, changePct: null, trend: current > 0 ? "up" : "none" };
  }

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 1000) / 10;

  let trend: "up" | "down" | "flat" | "none" = "flat";
  if (pct > 0) trend = "up";
  else if (pct < 0) trend = "down";

  return { current, previous, changePct: pct, trend };
}

/**
 * Ingests a real watch progress/heartbeat event from the player.
 */
export async function recordWatchTelemetry(payload: {
  sessionId: string;
  userId?: string | null;
  mediaKey: string;
  mediaType: "movie" | "tv" | "anime" | "video";
  title?: string;
  season?: number;
  episode?: number;
  watchSeconds: number;
  totalDuration?: number;
  completed?: boolean;
  device?: string;
  providerId?: string;
}): Promise<void> {
  const {
    sessionId,
    userId,
    mediaKey,
    mediaType,
    title,
    season,
    episode,
    watchSeconds,
    totalDuration,
    completed,
    device = "desktop",
    providerId,
  } = payload;

  if (!sessionId || !mediaKey) return;
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  try {
    // 1. Find existing recent watch session for this user/session + mediaKey
    const existing = await prisma.watchSession.findFirst({
      where: {
        sessionId,
        mediaKey,
        createdAt: { gte: fourHoursAgo },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      await prisma.watchSession.update({
        where: { id: existing.id },
        data: {
          watchDuration: existing.watchDuration + Math.max(0, Math.min(watchSeconds, 120)), // cap per tick to prevent overflow
          totalDuration: totalDuration ? Math.max(existing.totalDuration, totalDuration) : existing.totalDuration,
          completed: completed ? true : existing.completed,
          updatedAt: now,
          userId: userId || existing.userId,
          providerId: providerId || existing.providerId,
        },
      });
    } else {
      await prisma.watchSession.create({
        data: {
          sessionId,
          userId: userId || null,
          mediaKey,
          mediaType: mediaType === "video" ? "movie" : mediaType,
          title: title || mediaKey,
          season: season || null,
          episode: episode || null,
          watchDuration: Math.max(0, Math.min(watchSeconds, 120)),
          totalDuration: totalDuration || 0,
          completed: completed || false,
          device: ["mobile", "desktop", "tablet"].includes(device.toLowerCase()) ? device.toLowerCase() : "desktop",
          providerId: providerId || null,
        },
      });
    }

    // 2. Also keep SiteActivity in sync for instant live presence
    await prisma.siteActivity.create({
      data: {
        sessionId,
        userId: userId || null,
        type: "WATCH",
        device: ["mobile", "desktop", "tablet"].includes(device.toLowerCase()) ? device.toLowerCase() : "desktop",
        mediaKey,
        mediaType: mediaType === "video" ? "movie" : mediaType,
        route: `/watch/${encodeURIComponent(mediaKey)}`,
      },
    });
  } catch (err) {
    // Non-blocking telemetry error
  }
}

/**
 * Computes all Super Admin production analytics metrics directly from PostgreSQL/SQLite.
 */
export async function getSuperAdminAnalytics(
  range: string = "today",
  customStart?: string,
  customEnd?: string
) {
  const dates = computeAnalyticsDateRange(range, customStart, customEnd);
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Run database aggregations concurrently
  const [
    // Live Presence
    activeVisitorsNowRecords,
    activeWatchNowRecords,

    // Current Period Counts
    currentVisits,
    currentSessionsGroup,
    currentWatchSessions,
    currentWatchDurationAgg,
    currentPageViews,
    currentRegistrations,
    currentLogins,
    currentSearches,
    currentPlaybackSuccess,
    currentPlaybackFailures,
    currentErrors,

    // Previous Period Counts (for honest comparisons)
    prevVisits,
    prevSessionsGroup,
    prevWatchSessions,
    prevWatchDurationAgg,
    prevPageViews,
    prevRegistrations,
    prevLogins,
    prevSearches,
    prevPlaybackSuccess,
    prevPlaybackFailures,
    prevErrors,

    // Registered users total & breakdowns
    totalRegisteredUsers,
    usersWithWatchlist,
    usersWithHistory,

    // Top Content
    topWatchSessions,

    // Raw timeline records for building charts
    timelineActivities,
    timelineWatchSessions,
    timelineUsers,
  ] = await Promise.all([
    // Active now (heartbeat or watch within last 5 minutes)
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { updatedAt: { gte: fiveMinAgo } },
    }),
    prisma.watchSession.groupBy({
      by: ["sessionId"],
      where: { updatedAt: { gte: fiveMinAgo } },
    }),

    // Current Period
    prisma.siteActivity.count({
      where: { type: "VISIT", createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.watchSession.count({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.watchSession.aggregate({
      _sum: { watchDuration: true },
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.siteActivity.count({
      where: { type: { in: ["VISIT", "PAGE_VIEW"] }, createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.siteActivity.count({
      where: { type: "LOGIN", createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.searchEvent.count({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.playbackAttempt.count({
      where: { status: "SUCCESS", createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.playbackAttempt.count({
      where: { status: { in: ["FAILED", "TIMEOUT"] }, createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),
    prisma.systemLog.count({
      where: { level: { in: ["ERROR", "FATAL"] }, createdAt: { gte: dates.startDate, lte: dates.endDate } },
    }),

    // Previous Period
    prisma.siteActivity.count({
      where: { type: "VISIT", createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.watchSession.count({
      where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.watchSession.aggregate({
      _sum: { watchDuration: true },
      where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.siteActivity.count({
      where: { type: { in: ["VISIT", "PAGE_VIEW"] }, createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.siteActivity.count({
      where: { type: "LOGIN", createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.searchEvent.count({
      where: { createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.playbackAttempt.count({
      where: { status: "SUCCESS", createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.playbackAttempt.count({
      where: { status: { in: ["FAILED", "TIMEOUT"] }, createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),
    prisma.systemLog.count({
      where: { level: { in: ["ERROR", "FATAL"] }, createdAt: { gte: dates.prevStartDate, lte: dates.prevEndDate } },
    }),

    // User Governance Stats
    prisma.user.count(),
    prisma.watchlist.groupBy({ by: ["userId"] }),
    prisma.watchHistory.groupBy({ by: ["userId"] }),

    // Top Content grouped by mediaKey
    prisma.watchSession.groupBy({
      by: ["mediaKey", "mediaType", "title"],
      _count: { id: true },
      _sum: { watchDuration: true },
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),

    // Timeline activity for charts
    prisma.siteActivity.findMany({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
      select: { createdAt: true, type: true, sessionId: true },
    }),
    prisma.watchSession.findMany({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
      select: { createdAt: true, watchDuration: true, mediaType: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: dates.startDate, lte: dates.endDate } },
      select: { createdAt: true },
    }),
  ]);

  // Metric derivations
  const totalVisitorsVal = currentSessionsGroup.length;
  const prevVisitorsVal = prevSessionsGroup.length;
  const totalPageViewsVal = Math.max(currentPageViews, totalVisitorsVal);
  const prevPageViewsVal = Math.max(prevPageViews, prevVisitorsVal);
  const totalWatchSecVal = currentWatchDurationAgg._sum.watchDuration || 0;
  const prevWatchSecVal = prevWatchDurationAgg._sum.watchDuration || 0;
  const totalWatchStartsVal = currentWatchSessions;
  const prevWatchStartsVal = prevWatchSessions;
  const totalPlaybackAttemptsVal = currentPlaybackSuccess + currentPlaybackFailures;
  const prevPlaybackAttemptsVal = prevPlaybackSuccess + prevPlaybackFailures;
  const playbackSuccessRateVal =
    totalPlaybackAttemptsVal > 0
      ? Math.round((currentPlaybackSuccess / totalPlaybackAttemptsVal) * 1000) / 10
      : null;
  const prevPlaybackSuccessRateVal =
    prevPlaybackAttemptsVal > 0
      ? Math.round((prevPlaybackSuccess / prevPlaybackAttemptsVal) * 1000) / 10
      : null;

  // Real Comparisons
  const comparisons = {
    visitors: calculateComparison(totalVisitorsVal, prevVisitorsVal),
    pageViews: calculateComparison(totalPageViewsVal, prevPageViewsVal),
    sessions: calculateComparison(totalVisitorsVal, prevVisitorsVal),
    watchTime: calculateComparison(totalWatchSecVal, prevWatchSecVal),
    watchStarts: calculateComparison(totalWatchStartsVal, prevWatchStartsVal),
    registrations: calculateComparison(currentRegistrations, prevRegistrations),
    logins: calculateComparison(currentLogins, prevLogins),
    searches: calculateComparison(currentSearches, prevSearches),
    playbackSuccessRate: calculateComparison(
      playbackSuccessRateVal ?? 0,
      prevPlaybackSuccessRateVal ?? 0
    ),
    playbackErrors: calculateComparison(currentPlaybackFailures, prevPlaybackFailures),
    systemErrors: calculateComparison(currentErrors, prevErrors),
  };

  // Build time series buckets
  const timeSeries: TimeSeriesPoint[] = [];

  if (dates.isHourly) {
    // 24 hourly buckets
    const startHour = new Date(dates.startDate);
    const endHour = new Date(dates.endDate);
    const hoursCount = Math.max(1, Math.min(48, Math.ceil((endHour.getTime() - startHour.getTime()) / (60 * 60 * 1000))));

    for (let i = 0; i < hoursCount; i++) {
      const bucketStart = new Date(startHour.getTime() + i * 60 * 60 * 1000);
      const bucketEnd = new Date(startHour.getTime() + (i + 1) * 60 * 60 * 1000);
      const label = `${String(bucketStart.getUTCHours()).padStart(2, "0")}:00`;

      const acts = timelineActivities.filter((a) => a.createdAt >= bucketStart && a.createdAt < bucketEnd);
      const watches = timelineWatchSessions.filter((w) => w.createdAt >= bucketStart && w.createdAt < bucketEnd);
      const users = timelineUsers.filter((u) => u.createdAt >= bucketStart && u.createdAt < bucketEnd);
      const uniqueSids = new Set(acts.map((a) => a.sessionId));

      timeSeries.push({
        timestamp: bucketStart.toISOString(),
        label,
        visitors: uniqueSids.size,
        pageViews: acts.filter((a) => a.type === "VISIT" || a.type === "PAGE_VIEW").length,
        sessions: uniqueSids.size,
        watchStarts: watches.length,
        watchSeconds: watches.reduce((acc, curr) => acc + curr.watchDuration, 0),
        registrations: users.length,
      });
    }
  } else {
    // Daily buckets for 7D, 14D, 30D, 90D
    const daysCount = Math.max(1, Math.ceil((dates.endDate.getTime() - dates.startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < daysCount; i++) {
      const bucketStart = new Date(dates.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(dates.startDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const label = `${dayNames[bucketStart.getUTCDay()]} ${bucketStart.getUTCDate()}`;

      const acts = timelineActivities.filter((a) => a.createdAt >= bucketStart && a.createdAt < bucketEnd);
      const watches = timelineWatchSessions.filter((w) => w.createdAt >= bucketStart && w.createdAt < bucketEnd);
      const users = timelineUsers.filter((u) => u.createdAt >= bucketStart && u.createdAt < bucketEnd);
      const uniqueSids = new Set(acts.map((a) => a.sessionId));

      timeSeries.push({
        timestamp: bucketStart.toISOString(),
        label,
        visitors: uniqueSids.size,
        pageViews: acts.filter((a) => a.type === "VISIT" || a.type === "PAGE_VIEW").length,
        sessions: uniqueSids.size,
        watchStarts: watches.length,
        watchSeconds: watches.reduce((acc, curr) => acc + curr.watchDuration, 0),
        registrations: users.length,
      });
    }
  }

  // Top content breakdown by category
  const topMovies: TopContentItem[] = [];
  const topTV: TopContentItem[] = [];
  const topAnime: TopContentItem[] = [];

  for (const item of topWatchSessions) {
    const entry: TopContentItem = {
      id: item.mediaKey,
      mediaKey: item.mediaKey,
      title: item.title || item.mediaKey,
      mediaType: (item.mediaType as any) || "movie",
      views: item._count.id,
      watchStarts: item._count.id,
      watchSeconds: item._sum.watchDuration || 0,
      completionRate: 0,
      uniqueViewers: item._count.id,
    };

    if (item.mediaType === "anime") {
      topAnime.push(entry);
    } else if (item.mediaType === "tv") {
      topTV.push(entry);
    } else {
      topMovies.push(entry);
    }
  }

  // Format watch time strings
  const hours = Math.floor(totalWatchSecVal / 3600);
  const minutes = Math.floor((totalWatchSecVal % 3600) / 60);
  const watchTimeFormatted = `${hours}h ${minutes}m`;

  const avgSessionSec = totalVisitorsVal > 0 ? Math.round(totalWatchSecVal / totalVisitorsVal) : 0;
  const avgSessionMin = Math.floor(avgSessionSec / 60);
  const avgSessionSecRem = avgSessionSec % 60;
  const avgSessionFormatted = `${avgSessionMin}m ${avgSessionSecRem}s`;

  return {
    range: dates.range,
    startDate: dates.startDate.toISOString(),
    endDate: dates.endDate.toISOString(),
    updatedAt: now.toISOString(),
    live: {
      activeVisitorsNow: activeVisitorsNowRecords.length,
      activeWatchNow: activeWatchNowRecords.length,
    },
    kpi: {
      visitors: comparisons.visitors,
      pageViews: comparisons.pageViews,
      sessions: comparisons.sessions,
      watchTimeSeconds: comparisons.watchTime,
      watchTimeFormatted,
      avgSessionFormatted,
      watchStarts: comparisons.watchStarts,
      registrations: comparisons.registrations,
      logins: comparisons.logins,
      searches: comparisons.searches,
      playbackSuccessRate: comparisons.playbackSuccessRate,
      playbackErrors: comparisons.playbackErrors,
      systemErrors: comparisons.systemErrors,
    },
    timeSeries,
    content: {
      topMovies: topMovies.slice(0, 5),
      topTV: topTV.slice(0, 5),
      topAnime: topAnime.slice(0, 5),
    },
    users: {
      total: totalRegisteredUsers,
      withWatchlist: usersWithWatchlist.length,
      withHistory: usersWithHistory.length,
    },
  };
}

/**
 * Computes Playback Health & Provider Health metrics from the real PlaybackAttempt database table.
 */
export async function getPlaybackAndProviderHealth() {
  const attempts = await prisma.playbackAttempt.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  const generalProviders = playbackRegistry.getGeneralProviders();
  const animeProviders = playbackRegistry.getAnimeProviders();

  // Aggregate attempts by provider
  const statsMap: Record<string, { total: number; success: number; failures: number; latencies: number[] }> = {};

  for (const att of attempts) {
    if (!statsMap[att.providerId]) {
      statsMap[att.providerId] = { total: 0, success: 0, failures: 0, latencies: [] };
    }
    statsMap[att.providerId].total++;
    if (att.status === "SUCCESS") {
      statsMap[att.providerId].success++;
      if (att.latencyMs > 0) statsMap[att.providerId].latencies.push(att.latencyMs);
    } else {
      statsMap[att.providerId].failures++;
    }
  }

  const mapToReport = (p: any, pool: "GENERAL" | "ANIME"): ProviderHealthReport => {
    const dbStat = statsMap[p.id];
    const cacheHealth = providerHealthCache.getHealth(p.id);

    const totalAttempts = dbStat?.total ?? (cacheHealth.totalSuccess + cacheHealth.totalFailures);
    const totalSuccess = dbStat?.success ?? cacheHealth.totalSuccess;
    const totalFailures = dbStat?.failures ?? cacheHealth.totalFailures;
    const successRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 1000) / 10 : null;

    const avgLatencyMs =
      dbStat && dbStat.latencies.length > 0
        ? Math.round(dbStat.latencies.reduce((a, b) => a + b, 0) / dbStat.latencies.length)
        : cacheHealth.latencyMs || 0;

    return {
      id: p.id,
      name: p.name,
      pool,
      enabled: p.enabled,
      priority: p.priority,
      status: cacheHealth.status || "CONFIGURED",
      totalAttempts,
      totalSuccess,
      totalFailures,
      successRate,
      avgLatencyMs,
      lastError: cacheHealth.lastError || null,
      lastChecked: cacheHealth.lastFailure || cacheHealth.lastSuccess || null,
    };
  };

  const generalPool = generalProviders.map((p) => mapToReport(p, "GENERAL"));
  const animePool = animeProviders.map((p) => mapToReport(p, "ANIME"));

  const totalAttempts = attempts.length;
  const successfulAttempts = attempts.filter((a) => a.status === "SUCCESS").length;
  const overallSuccessRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 1000) / 10 : null;

  return {
    totalAttempts,
    successfulAttempts,
    failedAttempts: totalAttempts - successfulAttempts,
    overallSuccessRate,
    generalPool,
    animePool,
  };
}

/**
 * Fetches recent live events across user actions and playback.
 */
export async function getLiveActivityFeed(limit: number = 20): Promise<LiveActivityEvent[]> {
  const [activities, searches, attempts, recentUsers] = await Promise.all([
    prisma.siteActivity.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.searchEvent.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.playbackAttempt.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  const events: LiveActivityEvent[] = [];

  for (const a of activities) {
    if (a.type === "WATCH") {
      events.push({
        id: a.id,
        type: "WATCH_START",
        description: `Started watching ${a.mediaKey || "media"}`,
        mediaType: a.mediaType,
        mediaTitle: a.mediaKey,
        actor: a.userId ? `User (${a.userId.substring(0, 6)})` : "Anonymous visitor",
        timestamp: a.createdAt.toISOString(),
        device: a.device,
      });
    } else if (a.type === "VISIT") {
      events.push({
        id: a.id,
        type: "PAGE_VIEW",
        description: `Visited ${a.route || "platform"}`,
        actor: a.userId ? `User (${a.userId.substring(0, 6)})` : "Anonymous visitor",
        timestamp: a.createdAt.toISOString(),
        device: a.device,
      });
    }
  }

  for (const s of searches) {
    events.push({
      id: s.id,
      type: "SEARCH",
      description: `Searched for "${s.query}" (${s.resultCount} results)`,
      actor: s.userId ? `User (${s.userId.substring(0, 6)})` : "Anonymous visitor",
      timestamp: s.createdAt.toISOString(),
    });
  }

  for (const p of attempts) {
    if (p.status !== "SUCCESS") {
      events.push({
        id: p.id,
        type: "PLAYBACK_FAIL",
        description: `Playback failed on provider ${p.providerId} (${p.errorMessage || "Timeout"})`,
        mediaType: p.mediaType,
        actor: "Stream Resolver",
        timestamp: p.createdAt.toISOString(),
      });
    }
  }

  for (const u of recentUsers) {
    events.push({
      id: u.id,
      type: "REGISTRATION",
      description: `New user registered account`,
      actor: u.email.split("@")[0] + "@***",
      timestamp: u.createdAt.toISOString(),
    });
  }

  // Sort unified events by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, limit);
}

/**
 * Groups and returns application errors.
 */
export async function getGroupedErrors(): Promise<GroupedErrorItem[]> {
  const logs = await prisma.systemLog.findMany({
    where: { level: { in: ["ERROR", "FATAL"] } },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const groupMap: Record<string, GroupedErrorItem> = {};

  for (const log of logs) {
    const signature = `${log.service}:${log.message.substring(0, 80)}`;
    if (!groupMap[signature]) {
      groupMap[signature] = {
        signature,
        service: log.service,
        level: log.level,
        message: log.message,
        occurrences: 0,
        firstSeen: log.createdAt.toISOString(),
        lastSeen: log.createdAt.toISOString(),
        sampleMetadata: log.metadata,
      };
    }
    groupMap[signature].occurrences++;
    if (new Date(log.createdAt) > new Date(groupMap[signature].lastSeen)) {
      groupMap[signature].lastSeen = log.createdAt.toISOString();
    }
    if (new Date(log.createdAt) < new Date(groupMap[signature].firstSeen)) {
      groupMap[signature].firstSeen = log.createdAt.toISOString();
    }
  }

  return Object.values(groupMap).sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Generates clean CSV exports for Super Admin analytics tables.
 */
export async function generateAnalyticsCsv(
  type: "visitors" | "watch" | "searches" | "playback" | "errors" | "users"
): Promise<string> {
  if (type === "visitors") {
    const activities = await prisma.siteActivity.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
    });
    const rows = [["Timestamp", "Session ID", "Type", "Device", "Route", "Media Key"].join(",")];
    for (const a of activities) {
      rows.push([
        `"${a.createdAt.toISOString()}"`,
        `"${a.sessionId}"`,
        `"${a.type}"`,
        `"${a.device}"`,
        `"${a.route || ""}"`,
        `"${a.mediaKey || ""}"`,
      ].join(","));
    }
    return rows.join("\n");
  }

  if (type === "watch") {
    const sessions = await prisma.watchSession.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
    });
    const rows = [["Timestamp", "Media Key", "Type", "Title", "Watch Seconds", "Completed", "Device", "Provider"].join(",")];
    for (const s of sessions) {
      rows.push([
        `"${s.createdAt.toISOString()}"`,
        `"${s.mediaKey}"`,
        `"${s.mediaType}"`,
        `"${(s.title || "").replace(/"/g, '""')}"`,
        s.watchDuration,
        s.completed ? "YES" : "NO",
        `"${s.device}"`,
        `"${s.providerId || ""}"`,
      ].join(","));
    }
    return rows.join("\n");
  }

  if (type === "searches") {
    const searches = await prisma.searchEvent.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
    });
    const rows = [["Timestamp", "Query", "Category", "Result Count"].join(",")];
    for (const s of searches) {
      rows.push([
        `"${s.createdAt.toISOString()}"`,
        `"${s.query.replace(/"/g, '""')}"`,
        `"${s.category || "all"}"`,
        s.resultCount,
      ].join(","));
    }
    return rows.join("\n");
  }

  if (type === "playback") {
    const attempts = await prisma.playbackAttempt.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
    });
    const rows = [["Timestamp", "Media Type", "TMDB/AniList ID", "Provider", "Status", "Latency Ms", "Error Message"].join(",")];
    for (const a of attempts) {
      rows.push([
        `"${a.createdAt.toISOString()}"`,
        `"${a.mediaType}"`,
        `"${a.tmdbId || a.anilistId || ""}"`,
        `"${a.providerId}"`,
        `"${a.status}"`,
        a.latencyMs,
        `"${(a.errorMessage || "").replace(/"/g, '""')}"`,
      ].join(","));
    }
    return rows.join("\n");
  }

  if (type === "errors") {
    const errors = await getGroupedErrors();
    const rows = [["Service", "Level", "Occurrences", "First Seen", "Last Seen", "Error Message"].join(",")];
    for (const e of errors) {
      rows.push([
        `"${e.service}"`,
        `"${e.level}"`,
        e.occurrences,
        `"${e.firstSeen}"`,
        `"${e.lastSeen}"`,
        `"${e.message.replace(/"/g, '""')}"`,
      ].join(","));
    }
    return rows.join("\n");
  }

  // users
  const users = await prisma.user.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, tier: true, adsFree: true, createdAt: true },
  });
  const rows = [["User ID", "Name", "Email", "Role", "Tier", "Ads Free", "Registered At"].join(",")];
  for (const u of users) {
    rows.push([
      `"${u.id}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.tier}"`,
      u.adsFree ? "YES" : "NO",
      `"${u.createdAt.toISOString()}"`,
    ].join(","));
  }
  return rows.join("\n");
}
