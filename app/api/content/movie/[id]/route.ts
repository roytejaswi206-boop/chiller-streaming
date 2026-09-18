import { NextRequest, NextResponse } from "next/server";
import { getUnifiedMovie } from "@/lib/content/resolver";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid movie ID" }, { status: 400 });
    }

    const movie = await getUnifiedMovie(id);
    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: movie,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load movie" },
      { status: 500 }
    );
  }
}
