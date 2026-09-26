import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, writeAuditLog, getClientIp } from "@/lib/security/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_SECTIONS = [
  { title: "Cinematic Hero Slider", queryJson: JSON.stringify({ category: "hero" }), order: 1, enabled: true, layout: "backdrop" },
  { title: "Trending Now", queryJson: JSON.stringify({ category: "trending" }), order: 2, enabled: true, badge: "Top 10 Global", layout: "backdrop" },
  { title: "Continue Watching", queryJson: JSON.stringify({ category: "history" }), order: 3, enabled: true, layout: "backdrop" },
  { title: "Trending Movies", queryJson: JSON.stringify({ category: "trending_movies" }), order: 4, enabled: true, layout: "poster" },
  { title: "Trending Series", queryJson: JSON.stringify({ category: "trending_tv" }), order: 5, enabled: true, layout: "poster" },
  { title: "Trending Anime", queryJson: JSON.stringify({ category: "anime" }), order: 6, enabled: true, badge: "AniList", layout: "poster" },
  { title: "Popular Movies", queryJson: JSON.stringify({ category: "popular" }), order: 7, enabled: true, layout: "poster" },
  { title: "Popular Series", queryJson: JSON.stringify({ category: "popular" }), order: 8, enabled: true, layout: "poster" },
  { title: "Popular Anime", queryJson: JSON.stringify({ category: "popular" }), order: 9, enabled: true, badge: "AniList", layout: "poster" },
  { title: "Action Blockbusters", queryJson: JSON.stringify({ category: "genre:action" }), order: 10, enabled: true, layout: "poster" },
  { title: "Sci-Fi & Cyberpunk", queryJson: JSON.stringify({ category: "genre:scifi" }), order: 11, enabled: true, layout: "poster" },
  { title: "Comedy & Laughs", queryJson: JSON.stringify({ category: "genre:comedy" }), order: 12, enabled: true, layout: "poster" },
  { title: "K-Drama Sensations", queryJson: JSON.stringify({ category: "kdrama" }), order: 13, enabled: true, badge: "#KDRAMA", layout: "poster" },
  { title: "Top Rated All Time", queryJson: JSON.stringify({ category: "top_rated" }), order: 14, enabled: true, badge: "#TOPRATED", layout: "poster" },
];

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    let sections = await prisma.homepageSection.findMany({
      orderBy: { order: "asc" },
    });

    if (sections.length === 0) {
      // Seed initial sections in DB
      for (const s of DEFAULT_SECTIONS) {
        await prisma.homepageSection.create({
          data: s,
        });
      }
      sections = await prisma.homepageSection.findMany({
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json({ success: true, sections });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load homepage sections" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await req.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "Sections array required" }, { status: 400 });
    }

    // Persist all sections in transaction
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (s.id) {
        await prisma.homepageSection.update({
          where: { id: s.id },
          data: {
            title: s.title,
            order: i + 1,
            enabled: Boolean(s.enabled ?? s.isEnabled ?? true),
            layout: s.layout || "poster",
          },
        });
      } else {
        await prisma.homepageSection.create({
          data: {
            title: s.title,
            queryJson: s.queryJson || JSON.stringify({ category: s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") }),
            order: i + 1,
            enabled: Boolean(s.enabled ?? s.isEnabled ?? true),
            layout: s.layout || "poster",
            badge: s.badge || null,
          },
        });
      }
    }

    await writeAuditLog({
      adminEmail: authResult.email,
      action: "HOMEPAGE_CMS_UPDATE",
      target: "HOMEPAGE_SECTIONS",
      details: { sectionsCount: sections.length },
      ipAddress: getClientIp(req),
    });

    const updated = await prisma.homepageSection.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, sections: updated, message: "Homepage order persisted." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save homepage layout" },
      { status: 500 }
    );
  }
}
