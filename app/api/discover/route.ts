import { NextRequest, NextResponse } from "next/server";
import { discoverContent, DiscoveryQuery } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const mediaType = (searchParams.get("mediaType") || undefined) as any;
    const category = searchParams.get("category") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const language = searchParams.get("language") || undefined;
    const country = searchParams.get("country") || undefined;
    const sort = searchParams.get("sort") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const timeWindow = (searchParams.get("timeWindow") || undefined) as any;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const format = (searchParams.get("format") || undefined) as any;
    const query = searchParams.get("query") || searchParams.get("q") || undefined;

    const discoveryQuery: DiscoveryQuery = {
      mediaType,
      category,
      genre,
      language,
      country,
      sort,
      page: isNaN(page) ? 1 : Math.max(1, page),
      timeWindow,
      year,
      format,
      query,
    };

    const response = await discoverContent(discoveryQuery);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    console.error("Discovery API Error:", err);
    return NextResponse.json(
      {
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
        hasNextPage: false,
        provider: "Error",
        error: err.message || "Failed to discover content",
      },
      { status: 500 }
    );
  }
}
