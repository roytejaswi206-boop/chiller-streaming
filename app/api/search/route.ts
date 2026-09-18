import { NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!query) {
    return NextResponse.json({ results: [], total_results: 0 });
  }

  try {
    const data = await searchMulti(query, page);
    return NextResponse.json(data);
  } catch (err: any) {
    if (err.message === "TMDB_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "TMDB API credentials are not configured.", results: [] },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch search results from TMDB.", results: [] },
      { status: 500 }
    );
  }
}
