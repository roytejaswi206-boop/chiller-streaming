import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAnime } from "@/lib/content/resolver";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid anime ID" }, { status: 400 });
    }

    const anime = await getUnifiedAnime(id);
    if (!anime) {
      return NextResponse.json({ success: false, error: "Anime not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: anime,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load anime" },
      { status: 500 }
    );
  }
}
