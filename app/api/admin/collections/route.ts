import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ collections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, description, backdropUrl, active = true, featured = false, items = [] } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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

    return NextResponse.json({ collection }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
