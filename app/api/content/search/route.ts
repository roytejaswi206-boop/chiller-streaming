import { NextRequest, NextResponse } from "next/server";
import { searchUnified } from "@/lib/content/resolver";
import { ContentType } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const type = (searchParams.get("type") || "") as ContentType;

    if (!query) {
      return NextResponse.json({ success: true, results: [], total: 0 });
    }

    const results = await searchUnified(query, type || undefined);

    return NextResponse.json({
      success: true,
      query,
      type: type || "all",
      total: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search content" },
      { status: 500 }
    );
  }
}
