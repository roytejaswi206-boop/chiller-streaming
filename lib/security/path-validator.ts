import path from "path";
import fs from "fs";

const BLOCKED_SYSTEM_PATHS = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "c:\\users\\default",
  "c:\\recovery",
  "c:\\boot",
  "c:\\system volume information",
  "/etc",
  "/bin",
  "/sbin",
  "/usr",
  "/var",
  "/proc",
  "/sys",
  "/root",
  "/boot",
  "/dev",
];

const BLOCKED_APP_SUBDIRS = [
  ".git",
  ".next",
  "node_modules",
  "prisma",
  "app",
  "components",
  "lib",
  "public",
  "scripts",
  "nginx",
];

export function getAllowedImportRoots(): string[] {
  const envRoots =
    process.env.ALLOWED_IMPORT_ROOTS ||
    "./media_storage/videos/original;./media_storage;D:\\VeloraImport;D:\\VideoArchive";
  return envRoots
    .split(";")
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => path.resolve(process.cwd(), r).toLowerCase());
}

/**
 * Validate that a target folder is within explicitly allowed import roots,
 * and not within sensitive OS directories or sensitive application source directories.
 */
export function validateImportPath(targetPath: string): {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
} {
  if (!targetPath || typeof targetPath !== "string" || targetPath.trim() === "") {
    return { valid: false, error: "Path cannot be empty" };
  }

  // Reject null bytes and path traversal tricks
  if (targetPath.includes("\0") || targetPath.includes("..")) {
    return { valid: false, error: "Invalid path: traversal sequences or null bytes detected" };
  }

  try {
    const cwd = process.cwd().toLowerCase();
    const resolved = path.resolve(process.cwd(), targetPath.trim());
    const lowerResolved = resolved.toLowerCase();

    // Check if target is a root drive directory (e.g. C:\ or /)
    const root = path.parse(resolved).root.toLowerCase();
    if (
      lowerResolved === root ||
      lowerResolved === `${root}\\` ||
      lowerResolved === `${root}/`
    ) {
      return { valid: false, error: "Scanning an entire root drive is strictly prohibited" };
    }

    // Check against blocked system paths
    for (const blocked of BLOCKED_SYSTEM_PATHS) {
      if (lowerResolved === blocked || lowerResolved.startsWith(`${blocked}\\`) || lowerResolved.startsWith(`${blocked}/`)) {
        return { valid: false, error: `Access to system directory is restricted: ${blocked}` };
      }
    }

    // Check against application source / internal directories (prevent source file exposure)
    for (const appSub of BLOCKED_APP_SUBDIRS) {
      const blockedAppPath = path.join(cwd, appSub).toLowerCase();
      if (lowerResolved === blockedAppPath || lowerResolved.startsWith(`${blockedAppPath}\\`) || lowerResolved.startsWith(`${blockedAppPath}/`)) {
        return { valid: false, error: `Access to application internal directory is prohibited: ${appSub}` };
      }
    }

    // Check against allowed roots
    const allowedRoots = getAllowedImportRoots();
    const isAllowed = allowedRoots.some((allowed) => {
      return (
        lowerResolved === allowed ||
        lowerResolved.startsWith(`${allowed}${path.sep}`) ||
        lowerResolved.startsWith(`${allowed}/`) ||
        lowerResolved.startsWith(`${allowed}\\`)
      );
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Path is not within ALLOWED_IMPORT_ROOTS. Configured allowed roots:\n${allowedRoots.join("\n")}`,
      };
    }

    if (!fs.existsSync(resolved)) {
      return { valid: false, error: `Directory does not exist: ${resolved}` };
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { valid: false, error: `Target path is not a directory: ${resolved}` };
    }

    return { valid: true, resolvedPath: resolved };
  } catch (err: any) {
    return { valid: false, error: `Path validation error: ${err.message}` };
  }
}

