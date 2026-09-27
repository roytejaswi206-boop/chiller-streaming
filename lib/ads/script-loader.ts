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
 * Sensitive authentication routes where NO third-party ad scripts are ever permitted.
 * This guarantees compliance with Google Safe Browsing and prevents credential interception.
 */
export const SENSITIVE_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/change-password",
  "/admin",
];

export function isAuthPath(pathname?: string): boolean {
  if (typeof window === "undefined" && !pathname) return false;
  const path = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  return SENSITIVE_AUTH_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`)
  );
}

/**
 * Completely purges third-party ad scripts and related elements from the DOM.
 * Invoked immediately whenever an authentication page is mounted.
 */
export function purgeAdScriptsAndElements(): void {
  if (typeof document === "undefined") return;

  const adScriptSelectors = [
    'script[src*="profitableratecpmnetwork.com"]',
    'script[src*="highrevenueformat.com"]',
    'script[src*="atOptions"]',
    'script[data-cfasync="false"]',
  ];

  adScriptSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      try {
        el.remove();
      } catch {}
    });
  });

  // Also remove ad iframes or containers if any were injected
  document.querySelectorAll('[id^="container-036795d0ec9ca91f70d3e5f8d8def3c3"]').forEach((el) => {
    try {
      el.remove();
    } catch {}
  });

  // Reset in-memory cache for third-party scripts
  loadedScripts.clear();
  pendingPromises.clear();
}

/**
 * Loads a third-party ad script safely with deduplication and timeout protection.
 * STRICT SECURITY: Rejects any load attempt if on an authentication page.
 */
export function loadAdScript(src: string, options: LoadScriptOptions = {}): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  // HARD SECURITY FIREWALL: Never load ad scripts on auth/admin pages
  if (isAuthPath()) {
    purgeAdScriptsAndElements();
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
