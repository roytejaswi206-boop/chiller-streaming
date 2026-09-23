/**
 * lib/playback/resume-service.ts
 *
 * CHILLER PLAYER EXPERIENCE 3.0 — RESUME SERVICE & SOURCE OF TRUTH
 *
 * Priority order (User Mandate Section 1):
 * 1. AUTHENTICATED USER → database watch progress (/api/user/history)
 * 2. GUEST → localStorage (chiller_progress_* & chiller_history)
 * 3. URL ?t= / ?resume= → explicit override only
 *
 * Strict completion rule (User Mandate Section 15):
 * progress / duration >= 0.95 is considered completed (reset/do not resume completed).
 */

export interface SavedWatchProgress {
  progressSeconds: number;
  durationSeconds?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  completed?: boolean;
  lastWatchedAt?: string;
  providerId?: string;
}

export interface ResolveResumeResult {
  position: number;
  duration?: number;
  source: "AUTH_DB" | "GUEST_STORAGE" | "URL_OVERRIDE" | "NONE";
  isCompleted: boolean;
  label?: string;
}

/**
 * Constructs the canonical localStorage key for watch progress.
 */
export function buildMediaProgressKey(
  mediaType: string,
  id: number | string | undefined,
  season = 1,
  episode = 1
): string {
  if (!id) return "";
  if (mediaType === "tv" || mediaType === "series") {
    return `chiller_progress_tv_${id}_s${season}_e${episode}`;
  }
  if (mediaType === "anime") {
    return `chiller_progress_tv_${id}_s${season}_e${episode}`;
  }
  return `chiller_progress_${mediaType}_${id}`;
}

/**
 * Validates a progress position:
 * - Must be a finite number
 * - Must be >= 5 seconds (ignore accidental starts)
 * - If duration > 0, must be < 95% of duration (Section 15 completion rule)
 * - Returns 0 if completed or invalid.
 */
export function validateProgressPosition(
  progressSeconds: number | undefined | null,
  durationSeconds: number | undefined | null
): { valid: boolean; position: number; isCompleted: boolean } {
  if (progressSeconds === undefined || progressSeconds === null || !Number.isFinite(progressSeconds)) {
    return { valid: false, position: 0, isCompleted: false };
  }

  const pos = Math.floor(progressSeconds);
  const dur = durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? Math.floor(durationSeconds)
    : 0;

  // 95% completion threshold
  if (dur > 0 && pos / dur >= 0.95) {
    return { valid: false, position: 0, isCompleted: true };
  }

  // Minimum 5 seconds to prevent accidental 1-second resume prompts
  if (pos < 5) {
    return { valid: false, position: 0, isCompleted: false };
  }

  // Upper bound sanity check (24 hours max)
  if (pos > 86400) {
    return { valid: false, position: 0, isCompleted: false };
  }

  return { valid: true, position: pos, isCompleted: false };
}

/**
 * Resolves the true resume position according to Section 1 Priority rules.
 */
export function resolveResumeSourceOfTruth({
  mediaType,
  tmdbId,
  anilistId,
  season = 1,
  episode = 1,
  urlTime,
  isExplicitResumeUrl = false,
  authDbItems,
  guestStorageItems,
}: {
  mediaType: "movie" | "tv" | "anime" | "video";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  urlTime?: number;
  isExplicitResumeUrl?: boolean;
  authDbItems?: any[];
  guestStorageItems?: Record<string, any>;
}): ResolveResumeResult {
  const id = tmdbId || anilistId;
  if (!id) {
    return { position: 0, source: "NONE", isCompleted: false };
  }

  // 1. Check Explicit URL Override (?t=... & ?resume=1)
  // Only override if the user intentionally navigated with explicit resume intent
  if (isExplicitResumeUrl && urlTime !== undefined && urlTime > 0) {
    const check = validateProgressPosition(urlTime, undefined);
    if (check.valid) {
      return {
        position: check.position,
        source: "URL_OVERRIDE",
        isCompleted: false,
      };
    }
  }

  // 2. AUTHENTICATED USER: Check Database watch progress
  if (Array.isArray(authDbItems) && authDbItems.length > 0) {
    const match = authDbItems.find((item: any) => {
      const itemTmdb = Number(item.tmdbId);
      const isSameId = itemTmdb === tmdbId || String(item.videoId) === String(id);
      if (!isSameId) return false;

      if (mediaType === "tv" || mediaType === "anime") {
        return (
          Number(item.seasonNumber || 1) === Number(season) &&
          Number(item.episodeNumber || 1) === Number(episode)
        );
      }
      return true;
    });

    if (match) {
      const check = validateProgressPosition(match.progressSeconds, match.durationSeconds);
      if (check.isCompleted) {
        return { position: 0, duration: match.durationSeconds, source: "AUTH_DB", isCompleted: true };
      }
      if (check.valid) {
        return {
          position: check.position,
          duration: match.durationSeconds,
          source: "AUTH_DB",
          isCompleted: false,
        };
      }
    }
  }

  // 3. GUEST: Check guestStorageItems (if provided directly) or browser localStorage
  const key = buildMediaProgressKey(mediaType, id, season, episode);

  if (guestStorageItems && guestStorageItems[key]) {
    const item = guestStorageItems[key];
    const pos = item.position ?? item.progressSeconds ?? item.currentTime;
    const dur = item.duration ?? item.durationSeconds;
    const check = validateProgressPosition(pos, dur);
    if (check.isCompleted) {
      return { position: 0, duration: dur, source: "GUEST_STORAGE", isCompleted: true };
    }
    if (check.valid) {
      return {
        position: check.position,
        duration: dur,
        source: "GUEST_STORAGE",
        isCompleted: false,
      };
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      // 3a. Direct item key
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const check = validateProgressPosition(parsed.progressSeconds || parsed.currentTime, parsed.durationSeconds || parsed.duration);
        if (check.isCompleted) {
          return { position: 0, duration: parsed.durationSeconds, source: "GUEST_STORAGE", isCompleted: true };
        }
        if (check.valid) {
          return {
            position: check.position,
            duration: parsed.durationSeconds,
            source: "GUEST_STORAGE",
            isCompleted: false,
          };
        }
      }

      // 3b. chiller_history array fallback
      const histRaw = localStorage.getItem("chiller_history");
      if (histRaw) {
        const hist = JSON.parse(histRaw);
        if (Array.isArray(hist)) {
          const match = hist.find((h: any) => {
            const isMatch = tmdbId ? h.tmdbId === tmdbId : h.id === id || h.videoId === String(id);
            if (!isMatch) return false;
            if (mediaType === "tv" || mediaType === "anime") {
              return (
                Number(h.seasonNumber || h.season || 1) === Number(season) &&
                Number(h.episodeNumber || h.episode || 1) === Number(episode)
              );
            }
            return true;
          });

          if (match) {
            const check = validateProgressPosition(match.progressSeconds || match.progress, match.durationSeconds || match.duration);
            if (check.isCompleted) {
              return { position: 0, duration: match.durationSeconds, source: "GUEST_STORAGE", isCompleted: true };
            }
            if (check.valid) {
              return {
                position: check.position,
                duration: match.durationSeconds,
                source: "GUEST_STORAGE",
                isCompleted: false,
              };
            }
          }
        }
      }
    } catch {
      // Quota / private browsing ignore
    }
  }

  // 4. URL fallback if provided without explicit resume flag (fallback only if valid)
  if (urlTime !== undefined && urlTime > 5) {
    const check = validateProgressPosition(urlTime, undefined);
    if (check.valid) {
      return {
        position: check.position,
        source: "URL_OVERRIDE",
        isCompleted: false,
      };
    }
  }

  return { position: 0, source: "NONE", isCompleted: false };
}

/**
 * Reliably persists watch progress using both localStorage and keepalive HTTP / sendBeacon.
 * Throttles database writes while guaranteeing persistence on unloads and pauses.
 */
export function persistWatchProgress({
  mediaType,
  tmdbId,
  anilistId,
  season = 1,
  episode = 1,
  currentTime,
  duration,
  title,
  posterUrl,
  providerId,
}: {
  mediaType: "movie" | "tv" | "anime" | "video";
  tmdbId?: number;
  anilistId?: number;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  title?: string;
  posterUrl?: string;
  providerId?: string;
}) {
  const id = tmdbId || anilistId;
  if (!id || !Number.isFinite(currentTime) || currentTime < 0) return;

  const isCompleted = duration > 0 && currentTime / duration >= 0.95;
  const progressSeconds = Math.floor(currentTime);
  const durationSeconds = Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 0;

  const payload = {
    currentTime: progressSeconds,
    progressSeconds,
    durationSeconds,
    duration: durationSeconds,
    season: season || 1,
    episode: episode || 1,
    seasonNumber: season || 1,
    episodeNumber: episode || 1,
    completed: isCompleted,
    providerId,
    savedAt: new Date().toISOString(),
    lastWatchedAt: new Date().toISOString(),
    tmdbId,
    mediaType,
    title,
    posterUrl,
  };

  // 1. Update localStorage item
  try {
    const key = buildMediaProgressKey(mediaType, id, season, episode);
    if (key) {
      localStorage.setItem(key, JSON.stringify(payload));
    }

    // 2. Update chiller_history array for rail synchronization
    const histRaw = localStorage.getItem("chiller_history");
    let hist: any[] = histRaw ? JSON.parse(histRaw) : [];
    if (!Array.isArray(hist)) hist = [];

    const existingIdx = hist.findIndex((h: any) =>
      tmdbId ? h.tmdbId === tmdbId : h.id === id || h.videoId === String(id)
    );

    const historyEntry = {
      id,
      tmdbId,
      mediaType,
      title: title || "Untitled",
      posterUrl,
      seasonNumber: season || 1,
      episodeNumber: episode || 1,
      progressSeconds,
      durationSeconds,
      completed: isCompleted,
      lastWatchedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      hist.splice(existingIdx, 1);
    }
    hist.unshift(historyEntry);
    localStorage.setItem("chiller_history", JSON.stringify(hist.slice(0, 50)));
  } catch {
    // Non-blocking quota error handling
  }

  // 3. Reliable server keepalive persistence (Section 3)
  const body = JSON.stringify({
    tmdbId,
    mediaType,
    title,
    posterUrl,
    season: season || 1,
    episode: episode || 1,
    progressSeconds,
    durationSeconds,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const beaconSent = navigator.sendBeacon("/api/user/history", blob);
    if (!beaconSent && typeof fetch !== "undefined") {
      fetch("/api/user/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } else if (typeof fetch !== "undefined") {
    fetch("/api/user/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}
