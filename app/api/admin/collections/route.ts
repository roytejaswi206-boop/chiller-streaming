import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, writeAuditLog, getClientIp } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const collections = await prisma.collection.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          take: 10,
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, collections });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await req.json();
    const { title, slug, description, backdropUrl, active = true, featured = false, items = [] } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const collection = await prisma.collection.create({
      data: {
        title,
        slug: cleanSlug,
        description,
        backdropUrl,
        active,
        featured,
        items: {
          create: items.map((item: any, idx: number) => ({
            tmdbId: item.tmdbId,
            anilistId: item.anilistId,
            mediaType: item.mediaType || "movie",
            title: item.title,
            posterUrl: item.posterUrl,
            order: idx,
          })),
        },
      },
    });

    await writeAuditLog({
      adminEmail: authResult.email,
      action: "COLLECTION_CREATE",
      target: cleanSlug,
      details: { title, itemsCount: items.length },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await req.json();
    const { id, active, title, description, featured, order } = body;

    if (!id) {
      return NextResponse.json({ error: "Collection ID is required" }, { status: 400 });
    }

    const data: any = {};
    if (typeof active === "boolean") data.active = active;
    if (typeof featured === "boolean") data.featured = featured;
    if (typeof title === "string") data.title = title;
    if (typeof description === "string") data.description = description;
    if (typeof order === "number") data.order = order;

    const collection = await prisma.collection.update({
      where: { id },
      data,
    });

    await writeAuditLog({
      adminEmail: authResult.email,
      action: "COLLECTION_UPDATE",
      target: collection.slug,
      details: data,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, collection });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireSuperAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Collection ID is required" }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { slug: true, title: true },
    });

    await prisma.collection.delete({
      where: { id },
    });

    await writeAuditLog({
      adminEmail: authResult.email,
      action: "COLLECTION_DELETE",
      target: collection?.slug || id,
      details: { title: collection?.title },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, message: "Collection deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
