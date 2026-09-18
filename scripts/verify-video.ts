import path from "path";
import { verifyHLSStream } from "../lib/hls-verifier";
import { defaultStorage } from "../lib/storage";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.log("Usage: npx tsx scripts/verify-video.ts <videoId or streamPath>");
    process.exit(1);
  }

  const streamDir = path.isAbsolute(target)
    ? target
    : (defaultStorage as any).getAbsolutePath
    ? path.join((defaultStorage as any).getAbsolutePath("videos/hls"), target)
    : path.join(process.cwd(), "media_storage", "videos", "hls", target);

  console.log(`Verifying HLS stream at: ${streamDir}`);
  const result = await verifyHLSStream(streamDir);

  if (result.valid) {
    console.log("✔ HLS Stream VERIFIED successfully!");
    console.log(`   - Master Playlist:  Present`);
    console.log(`   - Variants:         ${result.variantCount}`);
    console.log(`   - Video Chunks:     ${result.segmentCount} segments`);
    console.log(`   - Total Package:    ${(result.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  } else {
    console.error("✖ HLS Verification FAILED!");
    console.error(`   - Error: ${result.error}`);
    process.exit(1);
  }
}

main();
