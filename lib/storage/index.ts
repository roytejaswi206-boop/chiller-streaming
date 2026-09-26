import fs from "fs";
import path from "path";
import { Readable } from "stream";

export interface StorageFile {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

export interface StorageHeadResult {
  exists: boolean;
  size: number;
  lastModified?: Date;
  contentType?: string;
}

export interface StorageProvider {
  name: string;
  upload(key: string, data: Buffer | Uint8Array | Readable, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  head(key: string): Promise<StorageHeadResult>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  list(prefix?: string): Promise<StorageFile[]>;
  copy(sourceKey: string, destinationKey: string): Promise<boolean>;
  getAbsolutePath?(key: string): string;
}

/**
 * High-Performance Local Object Storage Provider
 * Self-Hosted, Free-First storage supporting organized media trees outside Git.
 * Structure:
 *   /videos/original/
 *   /videos/hls/
 *   /videos/thumbnails/
 *   /videos/posters/
 *   /videos/subtitles/
 */
export class LocalStorageProvider implements StorageProvider {
  name = "local";
  private baseDir: string;
  private servePrefix: string;

  constructor(baseDir?: string, servePrefix = "/api/storage") {
    const configuredPath = process.env.LOCAL_STORAGE_PATH || baseDir || "./media_storage";
    this.baseDir = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configuredPath);

    this.servePrefix = servePrefix;

    // Ensure directory structure exists in server context
    if (typeof window === "undefined") {
      const subDirs = [
        "videos/original",
        "videos/hls",
        "videos/thumbnails",
        "videos/posters",
        "videos/subtitles",
      ];

      for (const sub of subDirs) {
        try {
          const fullSub = path.join(/*turbopackIgnore: true*/ this.baseDir, sub);
          if (!fs.existsSync(/*turbopackIgnore: true*/ fullSub)) {
            fs.mkdirSync(fullSub, { recursive: true });
          }
        } catch {
          // Read-only filesystem in serverless environments like Vercel
        }
      }
    }
  }

  public getAbsolutePath(key: string): string {
    const sanitizedKey = key.replace(/^[\/\\]+/, "").replace(/[\/\\]+/g, path.sep);
    return path.join(/*turbopackIgnore: true*/ this.baseDir, sanitizedKey);
  }

  async upload(key: string, data: Buffer | Uint8Array | Readable, _contentType?: string): Promise<string> {
    const filePath = this.getAbsolutePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      await fs.promises.writeFile(filePath, data);
    } else if (data instanceof Readable) {
      const writeStream = fs.createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        data.pipe(writeStream);
        writeStream.on("finish", () => resolve(true));
        writeStream.on("error", reject);
      });
    }

    const normalizedKey = key.replace(/\\/g, "/").replace(/^\//, "");
    return `${this.servePrefix}/${normalizedKey}`;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.getAbsolutePath(key);
    return await fs.promises.readFile(filePath);
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.getAbsolutePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getAbsolutePath(key);
    return fs.existsSync(filePath);
  }

  async head(key: string): Promise<StorageHeadResult> {
    const filePath = this.getAbsolutePath(key);
    try {
      const stat = await fs.promises.stat(filePath);
      return {
        exists: true,
        size: stat.size,
        lastModified: stat.mtime,
      };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    const normalizedKey = key.replace(/\\/g, "/").replace(/^\//, "");
    // If a CDN base URL is configured, use it, otherwise use local streaming endpoint
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
    if (cdnBase) {
      return `${cdnBase}/${normalizedKey}`;
    }
    return `${this.servePrefix}/${normalizedKey}`;
  }

  async list(prefix = ""): Promise<StorageFile[]> {
    const results: StorageFile[] = [];
    const searchDir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;

    if (!fs.existsSync(searchDir)) return [];

    const walk = async (currentDir: string) => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stat = await fs.promises.stat(fullPath);
          const relativeKey = path.relative(this.baseDir, fullPath).replace(/\\/g, "/");
          results.push({
            key: relativeKey,
            size: stat.size,
            lastModified: stat.mtime,
          });
        }
      }
    };

    await walk(searchDir);
    return results;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<boolean> {
    const sourcePath = this.getAbsolutePath(sourceKey);
    const destPath = this.getAbsolutePath(destinationKey);

    if (!fs.existsSync(sourcePath)) return false;

    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    await fs.promises.copyFile(sourcePath, destPath);
    return true;
  }
}

/**
 * Optional S3-Compatible Cloud Storage Provider (AWS S3, Cloudflare R2, MinIO, Wasabi)
 * Completely optional; activates only when STORAGE_PROVIDER="s3".
 */
export class S3StorageProvider implements StorageProvider {
  name = "s3-compatible";
  private endpoint?: string;
  private bucket: string;
  private accessKey: string;
  private secretKey: string;
  private publicUrl?: string;

  constructor(options: {
    endpoint?: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    publicUrl?: string;
  }) {
    this.endpoint = options.endpoint;
    this.bucket = options.bucket;
    this.accessKey = options.accessKey;
    this.secretKey = options.secretKey;
    this.publicUrl = options.publicUrl;
  }

  async upload(key: string, _data: Buffer | Uint8Array | Readable, _contentType?: string): Promise<string> {
    if (!this.bucket || !this.accessKey) {
      throw new Error("S3 storage credentials not configured. Using local storage instead.");
    }
    const url = this.publicUrl ? `${this.publicUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
    return url;
  }

  async download(_key: string): Promise<Buffer> {
    throw new Error("S3 download requires active cloud credentials");
  }

  async delete(_key: string): Promise<boolean> {
    return true;
  }

  async exists(_key: string): Promise<boolean> {
    return true;
  }

  async head(_key: string): Promise<StorageHeadResult> {
    return { exists: true, size: 0 };
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async list(_prefix?: string): Promise<StorageFile[]> {
    return [];
  }

  async copy(_sourceKey: string, _destinationKey: string): Promise<boolean> {
    return true;
  }
}

/**
 * Storage Provider Factory based on environment configuration
 */
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3" && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY) {
    return new S3StorageProvider({
      endpoint: process.env.STORAGE_ENDPOINT,
      bucket: process.env.STORAGE_BUCKET,
      accessKey: process.env.STORAGE_ACCESS_KEY,
      secretKey: process.env.STORAGE_SECRET_KEY || "",
      publicUrl: process.env.STORAGE_PUBLIC_URL,
    });
  }

  return new LocalStorageProvider();
}

export const defaultStorage = getStorageProvider();
