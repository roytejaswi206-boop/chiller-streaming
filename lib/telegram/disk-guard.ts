import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

const DEFAULT_MIN_FREE_GB = 5.0; // 5 GB safety buffer

export interface DiskSpaceCheck {
  allowed: boolean;
  freeBytes: number;
  freeGB: number;
  requiredGB: number;
  minFreeGB: number;
  message?: string;
}

/**
 * Checks available disk space on the storage volume before downloads or transcoding.
 * Uses native Node.js statfs without external dependencies.
 */
export function checkAvailableDiskSpace(
  targetPath?: string,
  requiredAdditionalBytes = 0
): DiskSpaceCheck {
  try {
    const checkDir = targetPath
      ? path.resolve(process.cwd(), targetPath)
      : path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || "./media_storage");

    if (!fs.existsSync(checkDir)) {
      fs.mkdirSync(checkDir, { recursive: true });
    }

    const stat = fs.statfsSync(checkDir);
    const freeBytes = stat.bsize * stat.bfree;
    const freeGB = parseFloat((freeBytes / (1024 * 1024 * 1024)).toFixed(2));

    const minConfigGB = parseFloat(process.env.TELEGRAM_MIN_DISK_FREE_GB || "") || DEFAULT_MIN_FREE_GB;
    const requiredGB = parseFloat((requiredAdditionalBytes / (1024 * 1024 * 1024)).toFixed(2));
    const totalRequiredGB = minConfigGB + requiredGB;

    if (freeGB < totalRequiredGB) {
      const msg = `Insufficient storage space: ${freeGB} GB available, but ${totalRequiredGB.toFixed(2)} GB required (${minConfigGB} GB safety reserve + ${requiredGB} GB file).`;
      logger.warn("STORAGE", msg);
      return {
        allowed: false,
        freeBytes,
        freeGB,
        requiredGB,
        minFreeGB: minConfigGB,
        message: msg,
      };
    }

    return {
      allowed: true,
      freeBytes,
      freeGB,
      requiredGB,
      minFreeGB: minConfigGB,
    };
  } catch (err: any) {
    logger.error("STORAGE", `Failed to inspect disk free space: ${err.message}`);
    // If statfs fails for any reason, default to allowing with warning
    return {
      allowed: true,
      freeBytes: 10 * 1024 * 1024 * 1024,
      freeGB: 10,
      requiredGB: 0,
      minFreeGB: DEFAULT_MIN_FREE_GB,
    };
  }
}
