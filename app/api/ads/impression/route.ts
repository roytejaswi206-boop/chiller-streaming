/**
 * app/api/ads/impression/route.ts
 *
 * CHILLER — Ad Impression & Analytics API
 *
 * POST: Ingests lightweight telemetry for impressions and failures (non-blocking).
 * GET: Aggregates statistics for the /admin/ads dashboard (admin protected).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, placement, page, deviceType, status } = body;

    if (!provider || !placement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resilient write to database (does not crash or throw if DB is offline)
    try {
      await prisma.adImpression.create({
        data: {
          provider: String(provider).slice(0, 64),
          placement: String(placement).slice(0, 64),
          page: String(page || "/").slice(0, 255),
          deviceType: String(deviceType || "desktop").slice(0, 32),
          status: String(status || "success").slice(0, 32),
        },
      });
    } catch {
      // Non-blocking fallback for read-only or serverless DB
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [todayCount, sevenDayCount, thirtyDayCount, totalUsers, adsFreeUsers] = await Promise.all([
      prisma.adImpression.count({
        where: { createdAt: { gte: startOfToday } },
      }).catch(() => 0),
      prisma.adImpression.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }).catch(() => 0),
      prisma.adImpression.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }).catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.user.count({ where: { adsFree: true } }).catch(() => 0),
    ]);

    // Breakdown queries
    const [byProvider, byPlacement, byDevice, recentFailures] = await Promise.all([
      prisma.adImpression.groupBy({
        by: ["provider"],
        _count: { id: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }).catch(() => []),
      prisma.adImpression.groupBy({
        by: ["placement"],
        _count: { id: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }).catch(() => []),
      prisma.adImpression.groupBy({
        by: ["deviceType"],
        _count: { id: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }).catch(() => []),
      prisma.adImpression.count({
        where: { status: "failed", createdAt: { gte: sevenDaysAgo } },
      }).catch(() => 0),
    ]);

    return NextResponse.json({
      metrics: {
        todayCount,
        sevenDayCount,
        thirtyDayCount,
        totalUsers,
        adsFreeUsers,
        recentFailures,
      },
      byProvider: byProvider.map((p) => ({ provider: p.provider, count: p._count.id })),
      byPlacement: byPlacement.map((p) => ({ placement: p.placement, count: p._count.id })),
      byDevice: byDevice.map((d) => ({ device: d.deviceType, count: d._count.id })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to compile ad metrics", message: err?.message },
      { status: 500 }
    );
  }
}
