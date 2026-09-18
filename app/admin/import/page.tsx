"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/utils";

interface ScannedFile {
  fullPath: string;
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  isDuplicate: boolean;
  duplicateTitle?: string;
}

interface ScanResult {
  folderPath: string;
  totalFiles: number;
  totalSizeBytes: number;
  duplicateCount: number;
  newFilesCount: number;
  files: ScannedFile[];
  hasMore: boolean;
}

export default function AdminFolderImportPage() {
  const router = useRouter();
  const [folderPath, setFolderPath] = useState("./media_storage/videos/original");
  const [allowedRoots, setAllowedRoots] = useState<string[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "replace">("skip");
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load allowed import roots
  useEffect(() => {
    fetch("/api/admin/import/folder")
      .then((res) => res.json())
      .then((data) => {
        if (data.allowedRoots) setAllowedRoots(data.allowedRoots);
        if (data.defaultStagingPath) setFolderPath(data.defaultStagingPath);
      })
      .catch(() => {});
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setImportFeedback(null);

    try {
      const res = await fetch("/api/admin/import/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          folderPath: folderPath.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportFeedback({ type: "error", text: data.error || "Failed to scan folder" });
      } else {
        setScanResult(data);
      }
    } catch {
      setImportFeedback({ type: "error", text: "Network error communicating with server" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartImport = async () => {
    if (!scanResult || scanResult.newFilesCount === 0) return;

    setIsImporting(true);
    setImportFeedback(null);

    try {
      const res = await fetch("/api/admin/import/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          folderPath: folderPath.trim(),
          duplicatePolicy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportFeedback({ type: "error", text: data.error || "Import failed" });
      } else {
        setImportFeedback({
          type: "success",
          text: `Success! ${data.enqueuedCount} videos enqueued into the database queue. Start the worker process with 'npm run worker' to begin transcoding.`,
        });
        setTimeout(() => {
          router.push("/admin/processing");
        }, 2000);
      }
    } catch {
      setImportFeedback({ type: "error", text: "Failed to dispatch batch import" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Local Server Folder Import
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Optimized for large collections (100 to 10,000+ videos) stored on your local disk or NAS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/upload"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
          >
            ← Browser Upload
          </Link>
          <Link
            href="/admin/processing"
            className="px-3.5 py-1.5 rounded-xl velora-gradient text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:opacity-90 transition"
          >
            Processing Queue ⚡
          </Link>
        </div>
      </div>

      {/* Security & Configuration Notice */}
      <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF3864]">
            🛡️ Security Boundary Enforcement
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400">
            Path Traversal Protected
          </span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          For server security, scanning is restricted to configured <code className="text-rose-400 font-mono">ALLOWED_IMPORT_ROOTS</code>. Path traversal (<code className="text-rose-400 font-mono">../</code>) and system directories are rejected.
        </p>
        <div className="pt-2 border-t border-white/5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">
            Allowed Ingestion Roots:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allowedRoots.length === 0 ? (
              <span className="text-xs text-zinc-400 font-mono">./media_storage/videos/original</span>
            ) : (
              allowedRoots.map((root, i) => (
                <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-zinc-300">
                  {root}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Feedback Message */}
      {importFeedback && (
        <div
          className={`p-4 rounded-2xl border mb-6 text-xs font-semibold ${
            importFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {importFeedback.text}
        </div>
      )}

      {/* Folder Selection & Scan Form */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl mb-6">
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Folder Path on Server Disk
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="./media_storage/videos/original or D:\ChillerImport"
                className="flex-1 h-10 px-3.5 rounded-xl bg-[#181822] border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3864]"
              />
              <button
                type="submit"
                disabled={isScanning || isImporting}
                className="px-5 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isScanning ? "Scanning..." : "🔍 Scan Folder"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Recursively finds MP4, MKV, MOV, WEBM, AVI files without uploading them over HTTP.
            </p>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Duplicate Handling Policy
              </label>
              <select
                value={duplicatePolicy}
                onChange={(e) => setDuplicatePolicy(e.target.value as any)}
                className="h-9 px-3 rounded-xl bg-[#181822] border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-[#FF3864] cursor-pointer"
              >
                <option value="skip">Skip Already Imported Files (Recommended)</option>
                <option value="replace">Re-import & Overwrite Existing</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Scan Results Card */}
      {scanResult && (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Scan Summary</h3>
              <p className="text-xs font-mono text-zinc-400 mt-0.5 truncate max-w-lg">
                {scanResult.folderPath}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartImport}
                disabled={isImporting || scanResult.newFilesCount === 0}
                className="py-2.5 px-6 rounded-xl velora-gradient text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:opacity-95 transition disabled:opacity-40 cursor-pointer"
              >
                {isImporting ? "Queueing Videos..." : `🚀 Enqueue ${scanResult.newFilesCount} Videos`}
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Total Files
              </span>
              <span className="text-lg font-black text-white">{scanResult.totalFiles}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Total Size
              </span>
              <span className="text-lg font-black text-rose-400">
                {formatBytes(scanResult.totalSizeBytes)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Duplicates Found
              </span>
              <span className="text-lg font-black text-amber-400">{scanResult.duplicateCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                New to Ingest
              </span>
              <span className="text-lg font-black text-emerald-400">{scanResult.newFilesCount}</span>
            </div>
          </div>

          {/* Files List Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 block">
              Detected Video Files {scanResult.hasMore ? "(Previewing First 100)" : ""}:
            </span>
            <div className="max-h-80 overflow-y-auto rounded-xl border border-white/5 bg-black/30 divide-y divide-white/5 text-xs">
              {scanResult.files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-white/[0.02] transition">
                  <div className="truncate max-w-md pr-3">
                    <span className="font-semibold text-zinc-200 block truncate">{file.fileName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate block">
                      {file.relativePath}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-zinc-400 text-[11px]">
                      {formatBytes(file.sizeBytes)}
                    </span>
                    {file.isDuplicate ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                        DUPLICATE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        READY TO INGEST
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
