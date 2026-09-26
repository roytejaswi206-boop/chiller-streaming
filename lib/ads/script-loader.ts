/**
 * lib/ads/script-loader.ts
 *
 * CHILLER — Resilient Third-Party Script Loader
 *
 * Guarantees:
 * - Singleton script tags (no duplicate loads across navigations)
 * - Safe timeouts (never hangs the UI if provider CDN is slow or blocked)
 * - Error isolation (catches network and parse errors gracefully)
 * - Zero hydration mismatch (client-side execution only)
 */

type ScriptStatus = "idle" | "loading" | "ready" | "error";

const loadedScripts = new Map<string, ScriptStatus>();
const pendingPromises = new Map<string, Promise<boolean>>();

export interface LoadScriptOptions {
  async?: boolean;
  cfAsync?: boolean;
  timeoutMs?: number;
}

/**
 * Loads a third-party ad script safely with deduplication and timeout protection.
 */
export function loadAdScript(src: string, options: LoadScriptOptions = {}): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  const { async = true, cfAsync = false, timeoutMs = 8000 } = options;

  // Check cache
  const status = loadedScripts.get(src);
  if (status === "ready") return Promise.resolve(true);
  if (status === "error") return Promise.resolve(false);
  if (pendingPromises.has(src)) return pendingPromises.get(src)!;

  // Check if script tag already exists in DOM
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    loadedScripts.set(src, "ready");
    return Promise.resolve(true);
  }

  const promise = new Promise<boolean>((resolve) => {
    let resolved = false;

    // Timeout guard: if script hangs, fail gracefully without blocking CHILLER
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        loadedScripts.set(src, "error");
        pendingPromises.delete(src);
        resolve(false);
      }
    }, timeoutMs);

    const script = document.createElement("script");
    script.src = src;
    script.async = async;
    if (cfAsync) {
      script.setAttribute("data-cfasync", "false");
    }

    script.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        loadedScripts.set(src, "ready");
        pendingPromises.delete(src);
        resolve(true);
      }
    };

    script.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        loadedScripts.set(src, "error");
        pendingPromises.delete(src);
        resolve(false);
      }
    };

    try {
      document.body.appendChild(script);
      loadedScripts.set(src, "loading");
    } catch {
      clearTimeout(timer);
      loadedScripts.set(src, "error");
      pendingPromises.delete(src);
      resolve(false);
    }
  });

  pendingPromises.set(src, promise);
  return promise;
}

/**
 * Check if a script has already failed in this session (circuit breaker)
 */
export function isScriptFailed(src: string): boolean {
  return loadedScripts.get(src) === "error";
}
