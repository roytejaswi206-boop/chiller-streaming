"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatBytes, formatDuration } from "@/lib/utils";

interface TelegramStatus {
  status: "CONNECTED" | "DISCONNECTED" | "NOT_CONFIGURED" | "SETUP_REQUIRED" | "ERROR";
  hasApiId?: boolean;
  hasApiHash?: boolean;
  hasSession?: boolean;
  hasBotToken?: boolean;
  account?: {
    id: string;
    firstName: string;
    username?: string;
    phone?: string;
    isBot: boolean;
  };
  lastConnectedAt?: string;
  lastError?: string;
  message?: string;
}

interface SourceOption {
  id: string;
  title: string;
  username?: string;
  type: string;
  unreadCount: number;
}

interface ImportJob {
  id: string;
  sourceId: string;
  source?: {
    title: string;
    telegramId: string;
    type: string;
  };
  status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "PAUSED_STORAGE";
  mode: string;
  totalDiscovered: number;
  queued: number;
  downloading: number;
  downloaded: number;
  processing: number;
  ready: number;
  failed: number;
  duplicates: number;
  skipped: number;
  errorMessage?: string;
  createdAt: string;
  items?: any[];
}

export default function AdminTelegramPage() {
  const [status, setStatus] = useState<TelegramStatus>({ status: "NOT_CONFIGURED" });
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [savedSources, setSavedSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("me");
  const [customSourceId, setCustomSourceId] = useState<string>("");

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Import configuration
  const [importMode, setImportMode] = useState<"NEW_ONLY" | "BATCH" | "FULL_SYNC">("NEW_ONLY");
  const [batchSize, setBatchSize] = useState<number>(50);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(0);
  const [isStartingImport, setIsStartingImport] = useState(false);

  // Jobs state
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<{
    totalDiscovered: number;
    totalImported: number;
    totalDuplicates: number;
    totalFailed: number;
  }>({ totalDiscovered: 0, totalImported: 0, totalDuplicates: 0, totalFailed: 0 });

  // Session Setup Modal/Form
  const [showSetup, setShowSetup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [authStep, setAuthStep] = useState<"PHONE" | "CODE" | "MANUAL_STRING">("PHONE");
  const [manualSessionString, setManualSessionString] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/telegram/status");
      const data = await res.json();
      setStatus(data);
      if (data.status === "CONNECTED") {
        fetchSources();
      }
    } catch {
      setStatus({ status: "ERROR", lastError: "Failed to query Telegram status API." });
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/admin/telegram/sources");
      const data = await res.json();
      if (data.liveSources) setSources(data.liveSources);
      if (data.savedSources) setSavedSources(data.savedSources);
    } catch {
      // Non-fatal
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/admin/telegram/jobs");
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
      if (data.metrics) setGlobalMetrics(data.metrics);
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchJobs();

    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    const targetSourceId = customSourceId.trim() || selectedSourceId;
    if (!targetSourceId) return;

    setIsScanning(true);
    setScanResult(null);
    setFeedback(null);

    const selectedObj = sources.find((s) => s.id === targetSourceId);

    try {
      const res = await fetch("/api/admin/telegram/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTelegramId: targetSourceId,
          sourceTitle: selectedObj?.title || `Telegram Chat ${targetSourceId}`,
          sourceType: selectedObj?.type || "CHANNEL",
          sourceUsername: selectedObj?.username,
          batchSize: 50,
          maxFilesToScan: 200,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Scan failed." });
      } else {
        setScanResult(data.result);
        setFeedback({
          type: "success",
          text: `Scan complete: Found ${data.result.newDiscoveredCount} new videos (${data.result.totalDiscovered} total registered in source).`,
        });
        fetchSources();
        fetchJobs();
      }
    } catch {
      setFeedback({ type: "error", text: "Network error during scan." });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartImport = async () => {
    const targetSourceId = customSourceId.trim() || selectedSourceId;
    // Find matching database source
    const saved = savedSources.find((s) => s.telegramId === targetSourceId);
    if (!saved) {
      setFeedback({
        type: "error",
        text: "Please scan the source first so it is registered in the database.",
      });
      return;
    }

    setIsStartingImport(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/telegram/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: saved.id,
          mode: importMode,
          batchSize,
          maxFileSize: maxFileSizeMB > 0 ? BigInt(maxFileSizeMB * 1024 * 1024).toString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to start import." });
      } else {
        setFeedback({
          type: "success",
          text: `Import job dispatched! ${data.job.queued} items queued for download. Ensure worker is running with 'npm run worker'.`,
        });
        fetchJobs();
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to dispatch import job." });
    } finally {
      setIsStartingImport(false);
    }
  };

  const handleJobAction = async (jobId: string, action: "pause" | "resume" | "cancel") => {
    try {
      await fetch(`/api/admin/telegram/jobs/${jobId}/${action}`, { method: "POST" });
      fetchJobs();
    } catch {
      // Non-fatal
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const res = await fetch("/api/admin/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage(`Error: ${data.error}`);
      } else {
        setAuthStep("CODE");
        setAuthMessage("Verification code sent to your Telegram app/SMS.");
      }
    } catch {
      setAuthMessage("Network error requesting code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!phoneCode) return;
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const res = await fetch("/api/admin/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign_in",
          phoneCode,
          password: twoFactorPassword || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthMessage(`Error: ${data.error}`);
      } else if (data.requiresPassword) {
        setRequires2FA(true);
        setAuthMessage("Two-Step Verification password required.");
      } else {
        setAuthMessage("Success! Telegram session authenticated.");
        setShowSetup(false);
        fetchStatus();
      }
    } catch {
      setAuthMessage("Sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveManualString = async () => {
    if (!manualSessionString.trim()) return;
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const res = await fetch("/api/admin/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_session",
          sessionString: manualSessionString.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage(`Error: ${data.error}`);
      } else {
        setAuthMessage("Session string verified!");
        setShowSetup(false);
        fetchStatus();
      }
    } catch {
      setAuthMessage("Failed to verify session string.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Telegram Media Ingestion Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Authorized server-side media importer for Saved Messages, private channels, and groups (up to 10,000+ files)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/processing"
            className="px-3.5 py-1.5 rounded-xl velora-gradient text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:opacity-90 transition"
          >
            Worker Queue ⚡
          </Link>
          <Link
            href="/admin/videos?source=TELEGRAM"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
          >
            Imported Videos 🎬
          </Link>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          status.status === "CONNECTED"
            ? "border-emerald-500/30 bg-emerald-500/10"
            : status.status === "SETUP_REQUIRED"
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-rose-500/30 bg-rose-500/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status.status === "CONNECTED"
                    ? "bg-emerald-400 animate-pulse"
                    : status.status === "SETUP_REQUIRED"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Connection Status: {status.status}
              </h3>
            </div>

            <p className="text-xs text-zinc-300">
              {status.status === "CONNECTED" ? (
                <span>
                  Authenticated as{" "}
                  <strong className="text-white">{status.account?.firstName}</strong>{" "}
                  {status.account?.username && (
                    <span className="text-emerald-400">(@{status.account.username})</span>
                  )}{" "}
                  {status.account?.isBot ? "[Bot Account]" : "[User Client Session]"} &bull; Saved
                  Messages & Channels Accessible.
                </span>
              ) : status.status === "SETUP_REQUIRED" ? (
                "API credentials active in .env, but user session or bot token is required to connect."
              ) : (
                status.lastError ||
                "Configure TELEGRAM_API_ID and TELEGRAM_API_HASH in .env to connect."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {status.status !== "CONNECTED" && (
              <button
                onClick={() => setShowSetup(true)}
                className="py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition cursor-pointer"
              >
                ⚡ Authenticate Telegram
              </button>
            )}

            <button
              onClick={fetchStatus}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Global Ingestion Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Discovered
          </span>
          <span className="text-xl font-black text-white">{globalMetrics.totalDiscovered}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Imported & Ready
          </span>
          <span className="text-xl font-black text-emerald-400">{globalMetrics.totalImported}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Duplicates Blocked
          </span>
          <span className="text-xl font-black text-amber-400">{globalMetrics.totalDuplicates}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Failed / Errors
          </span>
          <span className="text-xl font-black text-rose-400">{globalMetrics.totalFailed}</span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Source Selection & Scanner Form */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Authorized Source Discovery</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select an authorized Telegram channel, group, or Saved Messages
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-zinc-400">
            Cursor-Paginated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Select Authorized Source
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#181822] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3864]"
            >
              <option value="me">Saved Messages (Private Cloud Archive)</option>
              {sources
                .filter((s) => s.id !== "me")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} {s.username ? `(@${s.username})` : `[${s.type}]`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Or Custom Channel ID / Username (Optional)
            </label>
            <input
              type="text"
              value={customSourceId}
              onChange={(e) => setCustomSourceId(e.target.value)}
              placeholder="-1001234567890 or @channel_archive"
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3864]"
            />
          </div>
        </div>

        {/* Scan Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleScan}
            disabled={isScanning || status.status !== "CONNECTED"}
            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer text-center"
          >
            {isScanning ? "Scanning Messages..." : "🔍 Scan Source for Media (Resumable Batch)"}
          </button>
        </div>

        {/* Scan Result Feedback */}
        {scanResult && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between font-mono text-zinc-300">
              <span>Batch Scanned: {scanResult.scannedBatchCount} messages</span>
              <span>New Videos Discovered: {scanResult.newDiscoveredCount}</span>
            </div>
            <div className="flex justify-between font-mono text-zinc-400 text-[11px]">
              <span>Next Checkpoint Cursor: {scanResult.lastScannedId}</span>
              <span>{scanResult.hasMore ? "More messages remaining" : "Reached end of archive"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ingestion Job Dispatcher */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Dispatch Ingestion Job</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Stream discovered media to disk, deduplicate by SHA-256, and enqueue for FFmpeg HLS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Import Mode
            </label>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-[#181822] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3864]"
            >
              <option value="NEW_ONLY">Import New Discovered Only</option>
              <option value="BATCH">Batch Limit Only</option>
              <option value="FULL_SYNC">Full Archive Sync</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Batch Size Target
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 50)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Max File Size (0 = No Limit)
            </label>
            <select
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(parseInt(e.target.value, 10) || 0)}
              className="w-full h-10 px-3 rounded-xl bg-[#181822] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3864]"
            >
              <option value={0}>No Limit (up to 2GB)</option>
              <option value={100}>100 MB</option>
              <option value={500}>500 MB</option>
              <option value={1000}>1 GB</option>
              <option value={2000}>2 GB</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartImport}
          disabled={isStartingImport || status.status !== "CONNECTED"}
          className="w-full py-3.5 rounded-xl velora-gradient text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:opacity-95 transition disabled:opacity-40 cursor-pointer"
        >
          {isStartingImport ? "Queueing Ingestion..." : "🚀 Start Server-Side Telegram Ingestion"}
        </button>
      </div>

      {/* Active & Historical Jobs Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Ingestion Jobs & Queues</h3>
          <button
            onClick={fetchJobs}
            className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
          >
            🔄 Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 font-mono">
            No Telegram ingestion jobs registered yet.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const totalItems = job.totalDiscovered || 1;
              const progressPct = Math.min(100, Math.round(((job.ready + job.duplicates + job.failed) / totalItems) * 100));

              return (
                <div
                  key={job.id}
                  className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {job.source?.title || `Source ${job.sourceId}`}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Job: {job.id} &bull; Mode: {job.mode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          job.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : job.status === "RUNNING"
                            ? "bg-purple-500/10 text-purple-400 animate-pulse"
                            : job.status === "PAUSED" || job.status === "PAUSED_STORAGE"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-white/10 text-zinc-400"
                        }`}
                      >
                        {job.status}
                      </span>

                      {job.status === "RUNNING" && (
                        <button
                          onClick={() => handleJobAction(job.id, "pause")}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-zinc-300 transition cursor-pointer"
                        >
                          Pause
                        </button>
                      )}

                      {job.status === "PAUSED" && (
                        <button
                          onClick={() => handleJobAction(job.id, "resume")}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-semibold text-emerald-300 transition cursor-pointer"
                        >
                          Resume
                        </button>
                      )}

                      {job.status !== "COMPLETED" && job.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleJobAction(job.id, "cancel")}
                          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-[11px] font-semibold text-red-300 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Progress: {progressPct}%</span>
                      <span>
                        {job.ready} ready &bull; {job.duplicates} duplicates &bull; {job.failed} failed &bull; {job.downloading} downloading
                      </span>
                    </div>
                    <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="velora-gradient h-full rounded-full transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {job.errorMessage && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px]">
                      {job.errorMessage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Telegram Setup & Session Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Telegram Client Authentication</h3>
              <button
                onClick={() => setShowSetup(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {authMessage && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300">
                {authMessage}
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-2 p-1 rounded-xl bg-[#181822] border border-white/5 text-xs font-semibold">
              <button
                onClick={() => setAuthStep("PHONE")}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  authStep !== "MANUAL_STRING" ? "bg-[#FF3864] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Phone Verification
              </button>
              <button
                onClick={() => setAuthStep("MANUAL_STRING")}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  authStep === "MANUAL_STRING" ? "bg-[#FF3864] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Paste StringSession
              </button>
            </div>

            {authStep === "PHONE" && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Telegram Phone Number (with country code)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white"
                />
                <button
                  onClick={handleSendCode}
                  disabled={authLoading || !phoneNumber}
                  className="w-full py-2.5 rounded-xl velora-gradient text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  {authLoading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </div>
            )}

            {authStep === "CODE" && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Verification Code (Sent to Telegram App)
                </label>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="12345"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white text-center font-mono text-base"
                />

                {requires2FA && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      2-Step Verification Password
                    </label>
                    <input
                      type="password"
                      value={twoFactorPassword}
                      onChange={(e) => setTwoFactorPassword(e.target.value)}
                      placeholder="Your 2FA password"
                      className="w-full h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white"
                    />
                  </div>
                )}

                <button
                  onClick={handleSignIn}
                  disabled={authLoading || !phoneCode}
                  className="w-full py-2.5 rounded-xl velora-gradient text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  {authLoading ? "Authenticating..." : "Authorize Telegram Session"}
                </button>
              </div>
            )}

            {authStep === "MANUAL_STRING" && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Existing GramJS / Telethon StringSession
                </label>
                <textarea
                  rows={4}
                  value={manualSessionString}
                  onChange={(e) => setManualSessionString(e.target.value)}
                  placeholder="Paste 1BVtsOGwB... string session"
                  className="w-full p-3 rounded-xl bg-[#181822] border border-white/10 text-xs text-white font-mono resize-none"
                />
                <button
                  onClick={handleSaveManualString}
                  disabled={authLoading || !manualSessionString}
                  className="w-full py-2.5 rounded-xl velora-gradient text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  {authLoading ? "Verifying..." : "Save and Connect Session"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
