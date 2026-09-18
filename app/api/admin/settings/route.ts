import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCodeSpecterApiKey, getPlaybackAggregatorUrl, getTmdbApiKey, setSystemSetting } from "@/lib/settings";
import { testTmdbConnection } from "@/lib/tmdb/client";
import { testCodeSpecterConnection } from "@/lib/codespecters/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tmdbKey = await getTmdbApiKey();
  const codeSpecterKey = await getCodeSpecterApiKey();
  const aggregatorUrl = await getPlaybackAggregatorUrl();

  // Test current connections
  let tmdbStatus: "CONNECTED" | "NOT_CONFIGURED" | "ERROR" = "NOT_CONFIGURED";
  let tmdbMessage = "TMDB API key is not configured.";
  if (tmdbKey) {
    const res = await testTmdbConnection(tmdbKey);
    tmdbStatus = res.success ? "CONNECTED" : "ERROR";
    tmdbMessage = res.message;
  }

  let codeSpecterStatus: "CONNECTED" | "NOT_CONFIGURED" | "ERROR" = "NOT_CONFIGURED";
  let codeSpecterMessage = "CodeSpecter API key is not configured.";
  if (codeSpecterKey) {
    const res = await testCodeSpecterConnection(codeSpecterKey);
    codeSpecterStatus = res.success ? "CONNECTED" : "ERROR";
    codeSpecterMessage = res.message;
  }

  return NextResponse.json({
    tmdb: {
      isConfigured: Boolean(tmdbKey),
      status: tmdbStatus,
      message: tmdbMessage,
      maskedKey: tmdbKey ? `${tmdbKey.slice(0, 4)}...${tmdbKey.slice(-4)}` : "",
    },
    codespecter: {
      isConfigured: Boolean(codeSpecterKey),
      status: codeSpecterStatus,
      message: codeSpecterMessage,
      maskedKey: codeSpecterKey ? `${codeSpecterKey.slice(0, 4)}...${codeSpecterKey.slice(-4)}` : "",
    },
    aggregator: {
      isConfigured: Boolean(aggregatorUrl),
      status: aggregatorUrl ? "CONNECTED" : "NOT_CONFIGURED",
      url: aggregatorUrl,
      message: aggregatorUrl ? `Configured (${aggregatorUrl})` : "Aggregator URL is not set.",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tmdbApiKey, codeSpecterApiKey, playbackAggregatorUrl } = body;

    if (tmdbApiKey !== undefined && tmdbApiKey.trim()) {
      await setSystemSetting("tmdb_api_key", tmdbApiKey.trim(), true);
    }

    if (codeSpecterApiKey !== undefined && codeSpecterApiKey.trim()) {
      await setSystemSetting("codespecter_api_key", codeSpecterApiKey.trim(), true);
    }

    if (playbackAggregatorUrl !== undefined) {
      await setSystemSetting("playback_aggregator_url", playbackAggregatorUrl.trim(), false);
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
