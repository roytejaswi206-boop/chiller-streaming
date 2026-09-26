/**
 * lib/analytics/tracker.ts
 *
 * Lightweight server-side activity processor and aggregate statistics engine.
 * Respects strict privacy: zero passwords, zero tokens, zero raw IPs exposed.
 */

import { prisma } from "@/lib/prisma";
import {
  ACTIVE_NOW_THRESHOLD_MS,
  WATCH_SESSION_DEDUPE_WINDOW_MS,
  STATS_CACHE_TTL_MS,
} from "./config";

export interface ActivityPayload {
  sessionId: string;
  userId?: string | null;
  type: "VISIT" | "HEARTBEAT" | "WATCH";
  device?: string;
  mediaKey?: string | null;
  mediaType?: string | null;
  route?: string | null;
}

export interface AdminStatsResponse {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersNow: number;
  totalVisits: number;
  visitsToday: number;
  totalWatchSessions: number;
  watchSessionsToday: number;
  totalContentViews: number;
  mobileUsers: number;
  desktopUsers: number;
  last24Hours: {
    hour: string;
    visits: number;
    watches: number;
  }[];
  last7Days: {
    date: string;
    day: string;
    visitors: number;
    views: number;
  }[];
  updatedAt: string;
}

let cachedStats: AdminStatsResponse | null = null;
let lastCacheTime = 0;

/**
 * Records a lightweight client activity with built-in deduplication.
 */
export async function recordSiteActivity(payload: ActivityPayload): Promise<void> {
  const { sessionId, userId, type, device = "desktop", mediaKey, mediaType, route } = payload;
  if (!sessionId) return;

  const cleanDevice = ["mobile", "desktop", "tablet"].includes(device.toLowerCase())
    ? device.toLowerCase()
    : "desktop";

  const now = new Date();

  try {
    if (type === "HEARTBEAT") {
      // Find latest activity record for this session and bump updatedAt
      const latest = await prisma.siteActivity.findFirst({
        where: { sessionId },
        orderBy: { updatedAt: "desc" },
      });

      if (latest) {
        await prisma.siteActivity.update({
          where: { id: latest.id },
          data: {
            updatedAt: now,
            userId: userId || latest.userId,
            device: cleanDevice,
          },
        });
      } else {
        await prisma.siteActivity.create({
          data: {
            sessionId,
            userId: userId || null,
            type: "HEARTBEAT",
            device: cleanDevice,
            route: route || null,
          },
        });
      }
      return;
    }

    if (type === "VISIT") {
      // Check if session had a VISIT within the past 30 minutes
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const recentVisit = await prisma.siteActivity.findFirst({
        where: {
          sessionId,
          type: "VISIT",
          updatedAt: { gte: thirtyMinAgo },
        },
      });

      if (recentVisit) {
        await prisma.siteActivity.update({
          where: { id: recentVisit.id },
          data: {
            updatedAt: now,
            userId: userId || recentVisit.userId,
            device: cleanDevice,
            route: route || recentVisit.route,
          },
        });
      } else {
        await prisma.siteActivity.create({
          data: {
            sessionId,
            userId: userId || null,
            type: "VISIT",
            device: cleanDevice,
            route: route || null,
          },
        });
      }
      return;
    }

    if (type === "WATCH") {
      // Deduplicate watch sessions for the same mediaKey within the window
      const dedupeWindow = new Date(now.getTime() - WATCH_SESSION_DEDUPE_WINDOW_MS);
      const recentWatch = await prisma.siteActivity.findFirst({
        where: {
          sessionId,
          type: "WATCH",
          mediaKey: mediaKey || undefined,
          createdAt: { gte: dedupeWindow },
        },
      });

      if (!recentWatch) {
        await prisma.siteActivity.create({
          data: {
            sessionId,
            userId: userId || null,
            type: "WATCH",
            device: cleanDevice,
            mediaKey: mediaKey || null,
            mediaType: mediaType || null,
            route: route || null,
          },
        });
      } else {
        // Just touch the updatedAt
        await prisma.siteActivity.update({
          where: { id: recentWatch.id },
          data: { updatedAt: now },
        });
      }
    }
  } catch {
    // Non-blocking telemetry error
  }
}

/**
 * Computes aggregate usage statistics for Super Admin.
 */
export async function getSuperAdminStats(): Promise<AdminStatsResponse> {
  const now = new Date();
  if (cachedStats && now.getTime() - lastCacheTime < STATS_CACHE_TTL_MS) {
    return cachedStats;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activeNowThreshold = new Date(now.getTime() - ACTIVE_NOW_THRESHOLD_MS);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  // Run database aggregations concurrently
  const [
    totalUsers,
    activeNowRecords,
    activeTodayRecords,
    totalVisits,
    visitsToday,
    totalWatchSessions,
    watchSessionsToday,
    existingViewsAgg,
    mobileSessions,
    desktopSessions,
    activities24h,
    activities7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { updatedAt: { gte: activeNowThreshold } },
    }),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { updatedAt: { gte: startOfToday } },
    }),
    prisma.siteActivity.count({
      where: { type: "VISIT" },
    }),
    prisma.siteActivity.count({
      where: { type: "VISIT", createdAt: { gte: startOfToday } },
    }),
    prisma.siteActivity.count({
      where: { type: "WATCH" },
    }),
    prisma.siteActivity.count({
      where: { type: "WATCH", createdAt: { gte: startOfToday } },
    }),
    prisma.video.aggregate({
      _sum: { views: true },
    }),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { device: "mobile" },
    }),
    prisma.siteActivity.groupBy({
      by: ["sessionId"],
      where: { device: { in: ["desktop", "tablet"] } },
    }),
    prisma.siteActivity.findMany({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      select: { createdAt: true, type: true },
    }),
    prisma.siteActivity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, type: true, sessionId: true },
    }),
  ]);

  const activeUsersNow = activeNowRecords.length;
  const activeUsersToday = activeTodayRecords.length;
  const totalContentViews = (existingViewsAgg._sum.views || 0) + totalWatchSessions;
  const mobileUsers = mobileSessions.length;
  const desktopUsers = desktopSessions.length;

  // Compute 24-hour hourly activity buckets
  const last24HoursMap: Record<number, { hour: string; visits: number; watches: number }> = {};
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourLabel = `${d.getHours()}:00`;
    last24HoursMap[d.getHours()] = { hour: hourLabel, visits: 0, watches: 0 };
  }

  for (const act of activities24h) {
    const actHour = act.createdAt.getHours();
    if (last24HoursMap[actHour]) {
      if (act.type === "VISIT") last24HoursMap[actHour].visits++;
      if (act.type === "WATCH") last24HoursMap[actHour].watches++;
    }
  }

  const last24Hours = Object.values(last24HoursMap);

  // Compute 7-day daily visitor buckets
  const last7DaysMap: Record<string, { date: string; day: string; sessions: Set<string>; views: number }> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const dayLabel = dayNames[d.getDay()];
    last7DaysMap[dateKey] = {
      date: dateKey,
      day: dayLabel,
      sessions: new Set<string>(),
      views: 0,
    };
  }

  for (const act of activities7d) {
    const dateKey = act.createdAt.toISOString().split("T")[0];
    if (last7DaysMap[dateKey]) {
      last7DaysMap[dateKey].sessions.add(act.sessionId);
      if (act.type === "WATCH") {
        last7DaysMap[dateKey].views++;
      }
    }
  }

  const last7Days = Object.values(last7DaysMap).map((item) => ({
    date: item.date,
    day: item.day,
    visitors: item.sessions.size,
    views: item.views,
  }));

  const response: AdminStatsResponse = {
    totalUsers,
    activeUsersToday,
    activeUsersNow,
    totalVisits: Math.max(totalVisits, activeUsersToday),
    visitsToday: Math.max(visitsToday, activeUsersToday),
    totalWatchSessions,
    watchSessionsToday,
    totalContentViews,
    mobileUsers,
    desktopUsers,
    last24Hours,
    last7Days,
    updatedAt: now.toISOString(),
  };

  cachedStats = response;
  lastCacheTime = now.getTime();

  return response;
}
