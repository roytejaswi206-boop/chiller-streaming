import { NextRequest, NextResponse } from "next/server";
import { CdnCacheEngine, CdnUrlEngine, cdnMetrics, cdnHealth } from "@/lib/cdn";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get("mediaId") || "";
    const fileName = searchParams.get("file") || "master.m3u8";
    const token = searchParams.get("token");
    const rangeHeader = req.headers.get("range");

    // Optional token validation
    if (process.env.CDN_SIGNED_URL_ENABLED === "true" && token) {
      const verified = CdnUrlEngine.verifySignedToken(token);
      if (!verified.valid) {
        return NextResponse.json(
          { error: "Access Denied: Invalid or Expired Playback Token" },
          { status: 403 }
        );
      }
    }

    const isManifest = fileName.endsWith(".m3u8");
    const isSegment = fileName.endsWith(".ts") || fileName.endsWith(".m4s") || fileName.endsWith(".mp4");
    const isSubtitle = fileName.endsWith(".vtt");

    // Determine cache headers
    let cacheHeaders = CdnCacheEngine.getCacheHeaders("MASTER_MANIFEST");
    if (isSegment) {
      cacheHeaders = CdnCacheEngine.getCacheHeaders("VOD_SEGMENT");
    } else if (isSubtitle) {
      cacheHeaders = CdnCacheEngine.getCacheHeaders("SUBTITLE");
    }

    // Resolve local media or simulated origin response
    const storageDir = process.env.LOCAL_STORAGE_PATH || "./media_storage";
    const filePath = path.join(process.cwd(), storageDir, fileName);

    // If file physically exists on storage, stream with Range support
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const totalSize = stat.size;

      if (rangeHeader) {
        const range = CdnUrlEngine.parseRangeHeader(rangeHeader, totalSize);
        if (range) {
          const stream = fs.createReadStream(filePath, { start: range.start, end: range.end });
          const responseHeaders = new Headers({
            ...cacheHeaders,
            "Content-Range": `bytes ${range.start}-${range.end}/${totalSize}`,
            "Content-Length": String(range.contentLength),
            "Content-Type": isSegment ? "video/mp2t" : isManifest ? "application/vnd.apple.mpegurl" : "application/octet-stream",
            "Accept-Ranges": "bytes",
          });

          cdnMetrics.recordRequest("cdn-primary", isSegment ? "VOD_SEGMENT" : "MANIFEST", Date.now() - start, true);
          // @ts-ignore Node stream to web stream
          return new NextResponse(stream as any, {
            status: 206,
            headers: responseHeaders,
          });
        }
      }

      const stream = fs.createReadStream(filePath);
      const responseHeaders = new Headers({
        ...cacheHeaders,
        "Content-Length": String(totalSize),
        "Content-Type": isSegment ? "video/mp2t" : isManifest ? "application/vnd.apple.mpegurl" : "application/octet-stream",
        "Accept-Ranges": "bytes",
      });

      cdnMetrics.recordRequest("cdn-primary", isSegment ? "VOD_SEGMENT" : "MANIFEST", Date.now() - start, true);
      // @ts-ignore Node stream to web stream
      return new NextResponse(stream as any, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Origin Shield virtual HLS manifest for authorized direct testing
    if (isManifest) {
      const dummyManifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
/api/cdn/proxy?mediaId=${encodeURIComponent(mediaId)}&file=stream_1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
/api/cdn/proxy?mediaId=${encodeURIComponent(mediaId)}&file=stream_720p.m3u8
`;
      cdnMetrics.recordRequest("cdn-primary", "MASTER_MANIFEST", Date.now() - start, true);
      return new NextResponse(dummyManifest, {
        status: 200,
        headers: {
          ...cacheHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
        },
      });
    }

    // Return empty 200/206 for virtual test segments
    cdnMetrics.recordRequest("cdn-primary", "VOD_SEGMENT", Date.now() - start, true);
    return new NextResponse(new Uint8Array([0x47, 0x40, 0x00, 0x10]), {
      status: 200,
      headers: {
        ...cacheHeaders,
        "Content-Type": "video/mp2t",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err: any) {
    cdnHealth.reportFailure("cdn-primary", err.message || "PROXY_ERROR");
    return NextResponse.json(
      { error: "CDN Edge Proxy Error", details: err.message },
      { status: 502 }
    );
  }
}
