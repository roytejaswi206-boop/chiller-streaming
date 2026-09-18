import fs from "fs";
import path from "path";

export interface HLSVerificationResult {
  valid: boolean;
  masterExists: boolean;
  variantCount: number;
  segmentCount: number;
  totalSizeBytes: number;
  error?: string;
}

/**
 * Automated Verification Function for HLS Stream Packages
 * Ensures master playlist, variant playlists, and video chunks exist and are readable.
 */
export async function verifyHLSStream(streamDir: string): Promise<HLSVerificationResult> {
  const result: HLSVerificationResult = {
    valid: false,
    masterExists: false,
    variantCount: 0,
    segmentCount: 0,
    totalSizeBytes: 0,
  };

  try {
    if (!fs.existsSync(streamDir)) {
      return { ...result, error: `Stream directory does not exist: ${streamDir}` };
    }

    const masterPath = path.join(streamDir, "master.m3u8");
    if (!fs.existsSync(masterPath)) {
      return { ...result, error: `master.m3u8 not found in ${streamDir}` };
    }

    result.masterExists = true;
    const masterStat = await fs.promises.stat(masterPath);
    result.totalSizeBytes += masterStat.size;

    const masterContent = await fs.promises.readFile(masterPath, "utf-8");
    if (!masterContent.includes("#EXTM3U")) {
      return { ...result, error: "master.m3u8 is not a valid HLS manifest (missing #EXTM3U header)" };
    }

    // Extract all referenced variant playlist files (e.g. 1080p/index.m3u8)
    const variantLines = masterContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#") && l.endsWith(".m3u8"));

    if (variantLines.length === 0) {
      return { ...result, error: "master.m3u8 does not declare any variant playlists" };
    }

    result.variantCount = variantLines.length;

    // Verify each variant playlist and its segments
    for (const variantRelPath of variantLines) {
      const variantFullPath = path.join(streamDir, variantRelPath);
      if (!fs.existsSync(variantFullPath)) {
        return {
          ...result,
          error: `Variant playlist missing: ${variantRelPath}`,
        };
      }

      const variantStat = await fs.promises.stat(variantFullPath);
      result.totalSizeBytes += variantStat.size;

      const variantContent = await fs.promises.readFile(variantFullPath, "utf-8");
      if (!variantContent.includes("#EXTM3U")) {
        return {
          ...result,
          error: `Variant playlist ${variantRelPath} is corrupted or missing #EXTM3U header`,
        };
      }

      // Extract all .ts segment filenames
      const variantDir = path.dirname(variantFullPath);
      const segmentFiles = variantContent
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#") && l.endsWith(".ts"));

      if (segmentFiles.length === 0) {
        return {
          ...result,
          error: `Variant ${variantRelPath} contains 0 video segments`,
        };
      }

      // Verify every segment file on disk
      for (const seg of segmentFiles) {
        const segFullPath = path.join(variantDir, seg);
        if (!fs.existsSync(segFullPath)) {
          return {
            ...result,
            error: `Segment missing on disk: ${seg} in ${variantRelPath}`,
          };
        }

        const segStat = await fs.promises.stat(segFullPath);
        if (segStat.size === 0) {
          return {
            ...result,
            error: `Segment is empty (0 bytes): ${seg} in ${variantRelPath}`,
          };
        }

        result.segmentCount++;
        result.totalSizeBytes += segStat.size;
      }
    }

    result.valid = true;
    return result;
  } catch (err: any) {
    return {
      ...result,
      valid: false,
      error: `Verification error: ${err.message}`,
    };
  }
}
