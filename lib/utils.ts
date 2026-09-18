/**
 * Format duration in seconds to standard HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");

  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format view counts dynamically (e.g., 2.1M views, 450K views, 12K views)
 */
export function formatViews(views: number): string {
  if (!views || views < 0) return "0 views";
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B views`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${views} views`;
}

/**
 * Dynamic humanized relative date based on real database timestamps
 */
export function formatTimeAgo(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Recently";

  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInSec = Math.floor(diffInMs / 1000);
  const diffInMin = Math.floor(diffInSec / 60);
  const diffInHours = Math.floor(diffInMin / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSec < 60) return "Just now";
  if (diffInMin < 60) return `${diffInMin}m ago`;
  if (diffInHours < 24) return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInWeeks < 4) return diffInWeeks === 1 ? "1 week ago" : `${diffInWeeks} weeks ago`;
  if (diffInMonths < 12) return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

/**
 * Format bytes to readable string (e.g., 1.5 GB)
 */
export function formatBytes(bytes: number | bigint): string {
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!num || num <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Generate slug from string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}
