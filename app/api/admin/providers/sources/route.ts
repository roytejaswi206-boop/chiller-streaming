import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertSourceMapping, buildMediaKey } from "@/lib/playback/source-mapper";
import { getProviderDirectoryEntry } from "@/lib/playback/provider-directory";
import { requireAdmin } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/sources
 */
export async function GET(req: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const mediaKey = searchParams.get("mediaKey")?.trim();
    const providerId = searchParams.get("providerId")?.trim().toLowerCase();
    const status = searchParams.get("status")?.trim();

    const where: any = {};
    if (mediaKey) where.mediaKey = { contains: mediaKey };
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    const sources = await prisma.providerSource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const enriched = sources.map((s) => {
      const dir = getProviderDirectoryEntry(s.providerId);
      const isExpired = s.expiresAt && new Date(s.expiresAt) < new Date();
      return {
        ...s,
        providerName: dir ? dir.name : s.providerId.toUpperCase(),
        providerCategory: dir?.category || "VIDEO_HOST",
        docsUrl: dir?.docsUrl,
        isExpired,
      };
    });

    return NextResponse.json({
      success: true,
      sources: enriched,
      count: enriched.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to list sources" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/providers/sources
 */
export async function POST(req: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const {
      mediaType,
      tmdbId,
      anilistId,
      season,
      episode,
      title,
      providerId,
      providerMediaId,
      quality,
      format,
      status = "ACTIVE",
      expiresAt,
    } = body;

    if (!providerId || !providerMediaId) {
      return NextResponse.json(
        { success: false, message: "providerId and providerMediaId are required" },
        { status: 400 }
      );
    }

    const id = anilistId || tmdbId;
    if (!id || !mediaType) {
      return NextResponse.json(
        { success: false, message: "mediaType and id (tmdbId or anilistId) are required" },
        { status: 400 }
      );
    }

    const mediaKey = buildMediaKey(
      mediaType,
      id,
      season ? parseInt(String(season), 10) : undefined,
      episode ? parseInt(String(episode), 10) : undefined
    );

    const record = await upsertSourceMapping({
      mediaKey,
      providerId: providerId.toLowerCase().trim(),
      providerMediaId: providerMediaId.trim(),
      title: title?.trim(),
      season: season ? parseInt(String(season), 10) : undefined,
      episode: episode ? parseInt(String(episode), 10) : undefined,
      quality: quality?.trim() || "1080p HD",
      format: format?.trim() || (providerMediaId.includes(".m3u8") ? "HLS" : "EMBED"),
      status: status.toUpperCase().trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json({
      success: true,
      source: record,
      message: `Mapped ${providerId} source for ${mediaKey}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create source mapping" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/providers/sources
 */
export async function DELETE(req: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mapping ID is required" },
        { status: 400 }
      );
    }

    await prisma.providerSource.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Source mapping deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete source mapping" },
      { status: 500 }
    );
  }
}
