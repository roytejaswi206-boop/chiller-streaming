import { prisma } from "@/lib/prisma";

export interface ServerPingResult {
  serverId: string;
  name: string;
  endpoint: string;
  isOnline: boolean;
  latencyMs: number;
  status: "ONLINE" | "OFFLINE" | "UNREACHABLE" | "NOT_CONFIGURED";
  statusCode?: number;
  error?: string;
}

/**
 * Ping an origin server endpoint to measure genuine latency and availability.
 * A server is HEALTHY only when an actual HTTP response is received.
 */
export async function pingServer(endpoint: string, timeoutMs = 3000): Promise<{ isOnline: boolean; latencyMs: number; statusCode?: number; error?: string }> {
  if (!endpoint || endpoint.trim() === "" || endpoint.includes("example.com")) {
    return { isOnline: false, latencyMs: 0, error: "Endpoint not configured" };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const healthUrl = endpoint.endsWith("/") ? `${endpoint}api/health` : `${endpoint}/api/health`;
    const res = await fetch(healthUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Velora-ControlPlane/1.0" },
    }).catch(() => {
      // Fallback to base URL if /api/health is not directly routed
      return fetch(endpoint, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "Velora-ControlPlane/1.0" },
      });
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.max(1, Date.now() - startTime);

    if (res.status >= 200 && res.status < 400) {
      return { isOnline: true, latencyMs, statusCode: res.status };
    }

    return { isOnline: false, latencyMs, statusCode: res.status, error: `HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      isOnline: false,
      latencyMs: 0,
      error: err.name === "AbortError" ? "Ping timed out" : err.message,
    };
  }
}

/**
 * Check and update health status for all configured streaming servers in database.
 */
export async function auditAllOriginServers(): Promise<ServerPingResult[]> {
  const servers = await prisma.streamingServer.findMany();
  const results: ServerPingResult[] = [];

  for (const srv of servers) {
    const isConfigured = srv.endpoint && !srv.endpoint.includes("velora-cdn.net") && !srv.endpoint.includes("example.com");

    if (!isConfigured) {
      // Server has not been provisioned with a real endpoint
      await prisma.streamingServer.update({
        where: { id: srv.id },
        data: {
          isHealthy: false,
          status: "NOT_CONFIGURED",
          latencyMs: 0,
          lastCheckedAt: new Date(),
        },
      });

      results.push({
        serverId: srv.id,
        name: srv.name,
        endpoint: srv.endpoint,
        isOnline: false,
        latencyMs: 0,
        status: "NOT_CONFIGURED",
      });
      continue;
    }

    const ping = await pingServer(srv.endpoint);
    const status = ping.isOnline ? "ONLINE" : "UNREACHABLE";

    await prisma.streamingServer.update({
      where: { id: srv.id },
      data: {
        isHealthy: ping.isOnline,
        status,
        latencyMs: ping.latencyMs,
        failureCount: ping.isOnline ? 0 : { increment: 1 },
        lastSeen: ping.isOnline ? new Date() : undefined,
        lastCheckedAt: new Date(),
      },
    });

    results.push({
      serverId: srv.id,
      name: srv.name,
      endpoint: srv.endpoint,
      isOnline: ping.isOnline,
      latencyMs: ping.latencyMs,
      status,
      statusCode: ping.statusCode,
      error: ping.error,
    });
  }

  return results;
}
