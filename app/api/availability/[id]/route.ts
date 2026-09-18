import { NextRequest, NextResponse } from "next/server";
import { WatchmodeAvailabilityProvider } from "@/lib/content/providers/watchmode";

export const dynamic = "force-dynamic";

const watchmode = new WatchmodeAvailabilityProvider();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") === "tv" ? "tv" : "movie") as "movie" | "tv";

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid content ID" }, { status: 400 });
    }

    if (!watchmode.enabled) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: "Watchmode availability is optional and not enabled (WATCHMODE_ENABLED is not true).",
        availability: null,
      });
    }

    const availability = await watchmode.getAvailability(id, type);

    return NextResponse.json({
      success: true,
      configured: true,
      tmdbId: id,
      type,
      availability: availability || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query availability" },
      { status: 500 }
    );
  }
}
