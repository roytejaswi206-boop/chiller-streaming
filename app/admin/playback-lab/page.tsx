"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ProviderTestResult {
  providerId: string;
  providerName: string;
  priority: number;
  enabled: boolean;
  configuration: string;
  match: string;
  resolution: string;
  latencyMs: number;
  playerMode: string;
  candidateUrl?: string;
  player: string;
  playback: string;
  error?: string;
  capabilitiesMatrix?: {
    resume: string;
    audioTracks: string;
    audioSwitching: string;
    subtitles: string;
    quality: string;
    fullscreen: string;
    orientation: string;
  };
  diagnosticsPipeline?: {
    apiResponse: string;
    sourceResolved: string;
    playerReady: string;
    audioTracksFound: string;
    audioSwitchRequested: string;
    audioSwitchConfirmed: string;
    resumeRequested: string;
    resumeConfirmed: string;
    playbackStarted: string;
  };
  embedSafety?: {
    safetyTier: string;
    iframeLoad: string;
    playerReady: string;
    popupAttempt: string;
    topNavBehavior: string;
    fullscreen: string;
    orientation: string;
    actualPlayback: string;
    errorHandling: string;
    overallScore: string;
  };
}

export default function PlaybackLabPage() {
  const [mediaType, setMediaType] = useState<"movie" | "tv" | "anime">("movie");
  const [testId, setTestId] = useState("550");
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState<"standard" | "safety">("standard");
  const [results, setResults] = useState<ProviderTestResult[]>([]);
  const [autoCandidate, setAutoCandidate] = useState<any>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  const runTest = async (
    mode: "auto" | "all" | "single" | "mirrors" | "failover" | "latency",
    isSafetyMode = false
  ) => {
    setIsRunning(true);
    setTestMode(isSafetyMode ? "safety" : "standard");
    setResults([]);
    setAutoCandidate(null);

    const providerParam = mode === "single" ? `&provider=${selectedProvider}` : "";
    const modeParam = `&mode=${mode}`;

    try {
      const res = await fetch(
        `/api/playback/test?type=${mediaType}&id=${testId}&s=${season}&e=${episode}${modeParam}${providerParam}`
      );
      if (res.ok) {
        const data = await res.json();
        if (mode === "auto") {
          setAutoCandidate(data.primaryCandidate);
          setResults(
            data.candidates?.map((c: any) => ({
              providerId: c.providerId,
              providerName: c.providerName,
              priority: c.priority,
              enabled: true,
              configuration: "OK",
              match: "RESOLVED",
              resolution: "FOUND",
              latencyMs: c.latencyMs || 0,
              playerMode: c.type?.toUpperCase() || "EMBED",
              candidateUrl: c.url,
              player: "READY",
              playback: "READY_TO_TEST",
            })) || []
          );
        } else {
          setResults(data.results || []);
        }
      }
    } catch (err) {
      console.error("Diagnostic failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/providers"
              className="text-xs text-zinc-500 hover:text-white transition font-medium"
            >
              ← Providers
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              Lab & Diagnostics
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Admin Playback Lab
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Test candidate resolution, format negotiation, latency, and live iframe/HLS player readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/providers/sources"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition"
          >
            🗺️ Source Mapping
          </Link>
        </div>
      </div>

      {/* Target Input Console */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#12121a] space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-zinc-400 text-xs mb-1 font-medium">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => {
                const t = e.target.value as any;
                setMediaType(t);
                if (t === "movie") setTestId("550");
                if (t === "tv") setTestId("1399");
                if (t === "anime") setTestId("16498");
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3B6B]"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV Series</option>
              <option value="anime">Anime</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs mb-1 font-medium">
              {mediaType === "anime" ? "AniList ID" : "TMDB ID"}
            </label>
            <input
              type="text"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#FF3B6B]"
            />
          </div>

          {mediaType !== "movie" && (
            <>
              <div>
                <label className="block text-zinc-400 text-xs mb-1 font-medium">Season #</label>
                <input
                  type="number"
                  min="1"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#FF3B6B]"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1 font-medium">Episode #</label>
                <input
                  type="number"
                  min="1"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#FF3B6B]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-zinc-400 text-xs mb-1 font-medium">Selected Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3B6B]"
            >
              <option value="all">All Providers (Concurrent)</option>
              <option value="cinesrc">CineSrc</option>
              <option value="upstream">UpStream</option>
              <option value="mixdrop">MixDrop</option>
              <option value="filemoon">FileMoon</option>
              <option value="doodstream">DoodStream</option>
              <option value="vidoza">Vidoza</option>
              <option value="vidsrc">VidSrc</option>
              <option value="vidking">Vidking</option>
              <option value="codespecter">CodeSpecter</option>
              <option value="nhd">NHD Embed</option>
              <option value="nhd-anime">NHD Anime</option>
              <option value="anime-provider-a">Anime Provider A</option>
              <option value="anime-provider-b">Anime Provider B</option>
              <option value="anime-provider-c">Anime Provider C</option>
              <option value="megacloud-anime">MegaCloud Anime</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            onClick={() => runTest("all")}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
          >
            🌐 TEST ALL PROVIDERS
          </button>
          {selectedProvider !== "all" && (
            <button
              onClick={() => runTest("single")}
              disabled={isRunning}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
            >
              🎯 TEST PROVIDER
            </button>
          )}
          <button
            onClick={() => runTest("mirrors")}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-bold text-purple-200 transition disabled:opacity-50 cursor-pointer"
          >
            🪞 TEST MIRRORS
          </button>
          <button
            onClick={() => runTest("failover")}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 transition disabled:opacity-50 cursor-pointer"
          >
            🔀 TEST FAILOVER
          </button>
          <button
            onClick={() => runTest("latency")}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-bold text-sky-300 transition disabled:opacity-50 cursor-pointer"
          >
            ⏱️ TEST LATENCY
          </button>
          <button
            onClick={() => runTest("auto")}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-[#FF3B6B] hover:bg-[#FF3B6B]/90 text-xs font-bold text-white shadow-lg shadow-[#FF3B6B]/25 transition disabled:opacity-50 cursor-pointer"
          >
            ▶️ TEST PLAYBACK
          </button>
          <button
            onClick={() => runTest("all", true)}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            🛡️ TEST EMBED SAFETY
          </button>
          {isRunning && (
            <span className="text-xs text-zinc-400 font-mono animate-pulse">
              Running playback diagnostic across providers...
            </span>
          )}
        </div>
      </div>

      {/* Auto Mode Winner Highlight */}
      {autoCandidate && (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black">
              AUTO Mode Selected Winner
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              {autoCandidate.providerName} (HD-1)
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-xl">
              Type: {autoCandidate.type?.toUpperCase()} • Latency: {autoCandidate.latencyMs || 0}ms • URL: {autoCandidate.url}
            </p>
          </div>
          <button
            onClick={() => setActivePreviewUrl(autoCandidate.url)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition cursor-pointer"
          >
            ▶ Verify Playback
          </button>
        </div>
      )}

      {/* Test Output Cards Matrix */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((res) => {
            const isSuccess = res.resolution === "FOUND";

            return (
              <div
                key={res.providerId}
                className="rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-3 font-mono text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-bold text-white text-sm tracking-wide uppercase">
                      {res.providerName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isSuccess
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {res.resolution}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 text-zinc-400 text-[11px]">
                    {(res as any).mirrorLabel && (
                      <div className="flex justify-between font-bold text-purple-300">
                        <span>Mirror:</span>
                        <span>{(res as any).mirrorLabel}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Configuration:</span>
                      <span className={res.configuration === "OK" ? "text-emerald-400" : "text-amber-400"}>
                        {res.configuration}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Match:</span>
                      <span className="text-zinc-200">{res.match}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span className={isSuccess ? "text-emerald-400" : "text-rose-400"}>
                        {res.resolution}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span className="text-white font-bold">{res.latencyMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span className="text-blue-400">{res.playerMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Player:</span>
                      <span className={res.player === "READY" ? "text-emerald-400" : "text-zinc-500"}>
                        {res.player}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Playback:</span>
                      <span className="text-zinc-400">{res.playback}</span>
                    </div>

                    {res.error && (
                      <div className="pt-2 text-[10px] text-rose-400 truncate">
                        Err: {res.error}
                      </div>
                    )}

                    {/* Provider Capability Matrix (Section 20) */}
                    {res.capabilitiesMatrix && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1 bg-black/40 p-2 rounded-lg text-[10px]">
                        <div className="flex justify-between font-bold text-zinc-300">
                          <span>📊 Capability Matrix:</span>
                          <span className="text-zinc-400 font-mono text-[9px]">v3.0</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-400 pt-1 font-mono text-[9px]">
                          <div>Resume: <span className={res.capabilitiesMatrix.resume === "SUPPORTED" ? "text-emerald-400 font-bold" : res.capabilitiesMatrix.resume === "UNKNOWN" ? "text-amber-400" : "text-zinc-500"}>{res.capabilitiesMatrix.resume}</span></div>
                          <div>Audio: <span className={res.capabilitiesMatrix.audioTracks === "SUPPORTED" ? "text-emerald-400 font-bold" : res.capabilitiesMatrix.audioTracks === "UNKNOWN" ? "text-amber-400" : "text-zinc-500"}>{res.capabilitiesMatrix.audioTracks}</span></div>
                          <div>AudioSwitch: <span className={res.capabilitiesMatrix.audioSwitching === "SUPPORTED" ? "text-emerald-400 font-bold" : "text-zinc-500"}>{res.capabilitiesMatrix.audioSwitching}</span></div>
                          <div>Subtitles: <span className={res.capabilitiesMatrix.subtitles === "SUPPORTED" ? "text-emerald-400 font-bold" : "text-zinc-500"}>{res.capabilitiesMatrix.subtitles}</span></div>
                          <div>Quality: <span className={res.capabilitiesMatrix.quality === "SUPPORTED" ? "text-emerald-400 font-bold" : "text-zinc-500"}>{res.capabilitiesMatrix.quality}</span></div>
                          <div>Orientation: <span className="text-emerald-400 font-bold">{res.capabilitiesMatrix.orientation}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Admin Diagnostics Pipeline (Section 21) */}
                    {res.diagnosticsPipeline && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1 bg-black/40 p-2 rounded-lg text-[10px]">
                        <div className="flex justify-between font-bold text-zinc-300">
                          <span>🔬 Diagnostics Pipeline:</span>
                          <span className={res.diagnosticsPipeline.playbackStarted === "PLAYBACK STARTED" ? "text-emerald-400" : "text-amber-400"}>
                            {res.diagnosticsPipeline.playbackStarted}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-zinc-400 pt-1 font-mono text-[9px]">
                          <div className="flex justify-between">
                            <span>1. API:</span>
                            <span className={res.diagnosticsPipeline.apiResponse === "PASS" ? "text-emerald-400" : "text-rose-400"}>{res.diagnosticsPipeline.apiResponse}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2. Source:</span>
                            <span className="text-zinc-200">{res.diagnosticsPipeline.sourceResolved}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>3. Player:</span>
                            <span className="text-zinc-200">{res.diagnosticsPipeline.playerReady}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>4. Audio Tracks:</span>
                            <span className={res.diagnosticsPipeline.audioTracksFound === "AUDIO TRACKS FOUND" ? "text-emerald-400" : "text-zinc-400"}>{res.diagnosticsPipeline.audioTracksFound}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>5. Audio Switch:</span>
                            <span className={res.diagnosticsPipeline.audioSwitchConfirmed === "AUDIO SWITCH CONFIRMED" ? "text-emerald-400" : "text-zinc-500"}>{res.diagnosticsPipeline.audioSwitchConfirmed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6. Resume:</span>
                            <span className={res.diagnosticsPipeline.resumeConfirmed === "RESUME CONFIRMED" ? "text-emerald-400 font-bold" : "text-amber-400"}>{res.diagnosticsPipeline.resumeConfirmed}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Embed Safety & Redirect Protection 2.0 Diagnostics */}
                    {res.embedSafety && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1 bg-black/30 p-2 rounded-lg text-[10px]">
                        <div className="flex justify-between font-bold text-zinc-300">
                          <span>🛡️ Embed Safety:</span>
                          <span
                            className={
                              res.embedSafety.overallScore === "PASS"
                                ? "text-emerald-400"
                                : res.embedSafety.overallScore === "PARTIAL"
                                ? "text-amber-400"
                                : "text-zinc-500"
                            }
                          >
                            {res.embedSafety.overallScore} ({res.embedSafety.safetyTier})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-400 pt-1">
                          <div>Iframe: <span className="text-zinc-200">{res.embedSafety.iframeLoad}</span></div>
                          <div>Player: <span className="text-zinc-200">{res.embedSafety.playerReady}</span></div>
                          <div>Popups: <span className="text-emerald-400">{res.embedSafety.popupAttempt}</span></div>
                          <div>TopNav: <span className="text-emerald-400">{res.embedSafety.topNavBehavior}</span></div>
                          <div>Rotate: <span className="text-blue-400">{res.embedSafety.orientation}</span></div>
                          <div>Fullscreen: <span className="text-blue-400">{res.embedSafety.fullscreen}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isSuccess && res.candidateUrl && (
                  <div className="pt-3 border-t border-white/5">
                    <button
                      onClick={() => setActivePreviewUrl(res.candidateUrl || null)}
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition cursor-pointer text-center"
                    >
                      ▶ Test Player & Advance Time
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live Verification Frame */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#12121a] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Live Player Verification</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400">
                    Rule 52: Time must advance
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate max-w-2xl mt-0.5">
                  {activePreviewUrl}
                </div>
              </div>
              <button
                onClick={() => setActivePreviewUrl(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
              <iframe
                src={activePreviewUrl}
                className="w-full h-full border-0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; orientation-lock"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
