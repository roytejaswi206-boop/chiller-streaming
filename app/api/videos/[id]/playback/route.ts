import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selectBestOrigin } from "@/lib/origin-manager";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userRegion = req.headers.get("x-user-region") || "global";
    const referer = req.headers.get("referer") || "";

    // 1. Resolve video in database
    const video = await prisma.video.findFirst({
      where: {
        OR: [{ id }, { slug: id }, { publicId: id }],
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 2. Validate readiness
    if (video.status !== "READY") {
      return NextResponse.json(
        { error: "Video is currently processing or unavailable", status: video.status },
        { status: 422 }
      );
    }

    // 3. Validate published status
    if (!video.isPublished) {
      return NextResponse.json({ error: "Video has been unpublished" }, { status: 403 });
    }

    // 4. Validate Premium tier restriction
    if (video.visibility === "PREMIUM_ONLY" || video.isPremium) {
      const session = await getAuthSession();
      const userTier = (session?.user as any)?.tier || "FREE";
      const isAllowed = ["PREMIUM_MONTHLY", "PREMIUM_YEARLY", "VIP"].includes(userTier);

      if (!isAllowed) {
        return NextResponse.json(
          { error: "This video requires an active Premium membership", code: "PREMIUM_REQUIRED" },
          { status: 403 }
        );
      }
    }

    // 5. Validate Embed domain security if requested from external referrer
    const allowedDomains = process.env.ALLOWED_EMBED_DOMAINS || "*";
    if (allowedDomains !== "*" && referer) {
      try {
        const refHost = new URL(referer).hostname;
        const allowedList = allowedDomains.split(",").map((d) => d.trim().toLowerCase());
        const isDomainAllowed = allowedList.some((domain) => refHost === domain || refHost.endsWith(`.${domain}`));

        if (!isDomainAllowed) {
          return NextResponse.json(
            { error: "Playback is restricted on this domain", code: "EMBED_DOMAIN_RESTRICTED" },
            { status: 403 }
          );
        }
      } catch {
        // Ignore URL parse errors
      }
    }

    // 6. Generate smart origin routing manifest with signed token
    const manifest = await selectBestOrigin(video.id, userRegion, clientIp);

    if (!manifest) {
      return NextResponse.json({ error: "Origin stream unavailable" }, { status: 503 });
    }

    return NextResponse.json(manifest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
