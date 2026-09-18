import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeWithBigInt } from "@/lib/json-serializer";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (session?.user && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const { id } = await params;

    const job = await prisma.telegramImportJob.findUnique({
      where: { id },
      include: {
        source: true,
        items: {
          take: 100,
          orderBy: { createdAt: "desc" },
          include: {
            media: {
              select: {
                fileName: true,
                fileSizeBytes: true,
                duration: true,
                status: true,
                errorMessage: true,
                videoId: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job: serializeWithBigInt(job) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
