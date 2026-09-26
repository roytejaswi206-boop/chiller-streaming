import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordSiteActivity } from "@/lib/analytics/tracker";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const { sessionId, type, device, mediaKey, mediaType, route } = body;
    if (!sessionId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await recordSiteActivity({
      sessionId,
      userId: (session?.user as { id?: string } | undefined)?.id || null,
      type,
      device,
      mediaKey,
      mediaType,
      route,
    });

    return NextResponse.json({ success: true });
  } catch {
    // Non-blocking response
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
