import { prisma } from "@/lib/prisma";

export async function getSystemSetting(key: string, envFallback?: string): Promise<string> {
  // 1. Check environment variable first if provided
  if (envFallback && process.env[envFallback]) {
    return process.env[envFallback]!;
  }

  // 2. Check database system_settings
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    if (setting?.value) {
      return setting.value;
    }
  } catch {
    // If DB read fails during build/cold start, ignore
  }

  return "";
}

export async function setSystemSetting(key: string, value: string, isSecret = false): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, isSecret },
    create: { key, value, isSecret },
  });
}

export async function getTmdbApiKey(): Promise<string> {
  return (
    process.env.TMDB_API_KEY ||
    process.env.TMDB_ACCESS_TOKEN ||
    process.env.TMDB_API_ACCESS_TOKEN ||
    (await getSystemSetting("tmdb_api_key")) ||
    (await getSystemSetting("tmdb_access_token")) ||
    ""
  );
}

export async function getCodeSpecterApiKey(): Promise<string> {
  return (
    process.env.CODESPECTER_API_KEY ||
    (await getSystemSetting("codespecter_api_key")) ||
    ""
  );
}

export async function getPlaybackAggregatorUrl(): Promise<string> {
  return (
    process.env.PLAYBACK_AGGREGATOR_URL ||
    (await getSystemSetting("playback_aggregator_url")) ||
    ""
  );
}

export async function getVidSrcBaseUrl(): Promise<string> {
  return (
    process.env.VIDSRC_BASE_URL ||
    (await getSystemSetting("vidsrc_base_url")) ||
    "https://vidsrc.sh"
  );
}

export async function getVidkingBaseUrl(): Promise<string> {
  return (
    process.env.VIDKING_BASE_URL ||
    (await getSystemSetting("vidking_base_url")) ||
    "https://www.vidking.net"
  );
}

