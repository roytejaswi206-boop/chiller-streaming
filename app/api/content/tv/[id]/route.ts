import { NextRequest, NextResponse } from "next/server";
import { getUnifiedTV } from "@/lib/content/resolver";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid TV show ID" }, { status: 400 });
    }

    const show = await getUnifiedTV(id);
    if (!show) {
      return NextResponse.json({ success: false, error: "TV show not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: show,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load TV show" },
      { status: 500 }
    );
  }
}
