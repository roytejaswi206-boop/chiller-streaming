"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk (prevents browser RAM bloat)

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface UploadingFile {
  id: string;
  file: File;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE" | "PREMIUM";
  isFeatured: boolean;
  status: "PENDING" | "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "CANCELLED";
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  errorMessage?: string;
  abortController?: AbortController;
  videoId?: string;
  publicId?: string;
  watchSlug?: string;
  processingProgress?: number;
}

export default function AdminUploadPage() {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  // Poll processing jobs status for videos in QUEUED or PROCESSING state
  useEffect(() => {
    const hasActiveJobs = files.some(
      (f) => f.status === "QUEUED" || f.status === "PROCESSING"
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/processing/jobs");
        const data = await res.json();
        if (data.jobs) {
          setFiles((prev) =>
            prev.map((item) => {
              if (item.videoId) {
                const job = data.jobs.find((j: any) => j.videoId === item.videoId);
                if (job) {
                  if (job.status === "READY") {
                    return {
                      ...item,
                      status: "READY",
                      processingProgress: 100,
                    };
                  } else if (job.status === "FAILED") {
                    return {
                      ...item,
                      status: "FAILED",
                      errorMessage: job.errorMessage || "Transcoding failed",
                    };
                  } else if (
                    job.status === "PROCESSING" ||
                    job.status === "TRANSCODING" ||
                    job.status === "PACKAGING"
                  ) {
                    return {
                      ...item,
                      status: "PROCESSING",
                      processingProgress: job.progress || 10,
                    };
                  }
                }
              }
              return item;
            })
          );
        }
      } catch {
        // Polling error non-fatal
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [files]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const videoFiles = newFiles.filter(
      (f) => f.type.startsWith("video/") || /\.(mp4|mkv|mov|webm|avi|m4v)$/i.test(f.name)
    );

    if (videoFiles.length === 0) return;

    const newItems: UploadingFile[] = videoFiles.map((file) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        title: cleanName,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: "",
        categoryId: categories[0]?.id || "",
        visibility: "PUBLIC",
        isFeatured: false,
        status: "PENDING",
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        speedBps: 0,
        etaSeconds: 0,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.abortController) {
        target.abortController.abort();
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const cancelUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id && f.abortController) {
          f.abortController.abort();
          return { ...f, status: "CANCELLED", speedBps: 0, etaSeconds: 0 };
        }
        return f;
      })
    );
  };

  // Perform streaming chunked upload
  const startUpload = async (fileItem: UploadingFile) => {
    const file = fileItem.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `velora_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const abortController = new AbortController();

    // Update state to UPLOADING
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileItem.id
          ? {
              ...f,
              status: "UPLOADING",
              progress: 0,
              uploadedBytes: 0,
              abortController,
              errorMessage: undefined,
            }
          : f
      )
    );

    let uploaded = 0;
    const startTime = Date.now();

    try {
      // Stream chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortController.signal.aborted) {
          return;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunkBlob);
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("totalChunks", totalChunks.toString());

        const chunkRes = await fetch("/api/upload/chunk", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });

        if (!chunkRes.ok) {
          const errData = await chunkRes.json().catch(() => ({}));
          throw new Error(errData.error || `Chunk ${chunkIndex + 1} upload failed`);
        }

        uploaded += chunkBlob.size;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? uploaded / elapsedSec : 0;
        const remainingBytes = file.size - uploaded;
        const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;
        const progressPct = Math.min(99, Math.round((uploaded / file.size) * 100));

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  progress: progressPct,
                  uploadedBytes: uploaded,
                  speedBps,
                  etaSeconds,
                }
              : f
          )
        );
      }

      // Finalize and assemble on server disk, register video in DB, enqueue job
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          fileName: file.name,
          totalChunks,
          title: fileItem.title,
          slug: fileItem.slug,
          description: fileItem.description,
          categoryId: fileItem.categoryId,
          visibility: fileItem.visibility,
          isFeatured: fileItem.isFeatured,
          fileSizeBytes: file.size,
        }),
        signal: abortController.signal,
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || "Failed to finalize uploaded video");
      }

      if (completeData.warning && completeData.duplicateVideo) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: completeData.duplicateVideo.status === "READY" ? "READY" : "QUEUED",
                  progress: 100,
                  videoId: completeData.duplicateVideo.id,
                  publicId: completeData.duplicateVideo.publicId,
                  watchSlug: completeData.duplicateVideo.slug,
                  errorMessage: completeData.warning,
                }
              : f
          )
        );
        return;
      }

      // Transition to QUEUED status
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? {
                ...f,
                status: "QUEUED",
                progress: 100,
                videoId: completeData.video?.id,
                publicId: completeData.video?.publicId,
                watchSlug: completeData.video?.slug,
                processingProgress: 0,
              }
            : f
        )
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: "CANCELLED" } : f))
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "FAILED",
                  errorMessage: err.message || "Upload failed",
                }
              : f
          )
        );
      }
    }
  };

  const startAllPending = () => {
    files
      .filter((f) => f.status === "PENDING" || f.status === "FAILED" || f.status === "CANCELLED")
      .forEach((f) => startUpload(f));
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback({ id, type });
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Video Upload & Ingestion
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browser chunked streaming upload (1-50 videos) with background HLS queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/import"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
          >
            📁 Local Folder Import (10,000+ files)
          </Link>
          <Link
            href="/admin/processing"
            className="px-3.5 py-1.5 rounded-xl velora-gradient text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:opacity-90 transition"
          >
            Worker Queue ⚡
          </Link>
        </div>
      </div>

      {/* Architecture Separation Reminder Banner */}
      <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-zinc-300">
            <strong className="text-white">Decoupled Transcoding Architecture:</strong> Web server registers uploads into the database queue. Ensure dedicated worker is running in a terminal: <code className="text-rose-400 font-mono bg-black/40 px-1.5 py-0.5 rounded">npm run worker</code>
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 whitespace-nowrap">
          FFmpeg Isolated
        </span>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 mb-8 ${
          isDragging
            ? "border-[#FF3864] bg-[#FF3864]/5 scale-[0.99]"
            : "border-white/15 bg-[#12121a] hover:border-white/30 hover:bg-[#14141e]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,.mkv,.mp4,.mov,.webm,.avi"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl velora-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-600/20 text-white text-2xl font-bold">
          ⬆️
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          Drag and drop video files here
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
          Select single or multiple files (MP4, MKV, MOV, WEBM). Videos are streamed in 5MB slices directly to disk.
        </p>

        <button
          type="button"
          className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
        >
          Select Video Files
        </button>
      </div>

      {/* Upload Queue Section */}
      {files.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Uploads ({files.length})
            </h3>

            {files.some((f) => f.status === "PENDING" || f.status === "FAILED") && (
              <button
                onClick={startAllPending}
                className="py-2 px-4 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition cursor-pointer"
              >
                🚀 Start All Uploads
              </button>
            )}
          </div>

          <div className="space-y-4">
            {files.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl space-y-4"
              >
                {/* File Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300">
                      🎬
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-md">
                        {item.file.name}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        item.status === "READY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : item.status === "PROCESSING"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse"
                          : item.status === "QUEUED"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : item.status === "UPLOADING"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : item.status === "FAILED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {item.status === "PROCESSING"
                        ? `TRANSCODING ${item.processingProgress || 0}%`
                        : item.status}
                    </span>

                    {item.status === "PENDING" && (
                      <button
                        onClick={() => startUpload(item)}
                        className="py-1 px-3 rounded-lg velora-gradient text-white text-[11px] font-bold hover:opacity-90 transition cursor-pointer"
                      >
                        Upload
                      </button>
                    )}

                    {item.status === "UPLOADING" && (
                      <button
                        onClick={() => cancelUpload(item.id)}
                        className="py-1 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    {(item.status === "FAILED" || item.status === "CANCELLED") && (
                      <button
                        onClick={() => startUpload(item)}
                        className="py-1 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-bold transition cursor-pointer"
                      >
                        Retry
                      </button>
                    )}

                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white text-xs transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Speed / ETA */}
                {(item.status === "UPLOADING" || item.status === "PROCESSING") && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>
                        {item.status === "UPLOADING"
                          ? `Uploading: ${item.progress}% (${formatBytes(item.uploadedBytes)} / ${formatBytes(item.totalBytes)})`
                          : `FFmpeg HLS Conversion: ${item.processingProgress || 0}%`}
                      </span>
                      {item.status === "UPLOADING" && item.speedBps > 0 && (
                        <span>
                          {formatBytes(item.speedBps)}/s &bull; ETA: {item.etaSeconds}s
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-150 velora-gradient"
                        style={{
                          width: `${
                            item.status === "UPLOADING"
                              ? item.progress
                              : item.processingProgress || 5
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {item.errorMessage && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                    {item.errorMessage}
                  </div>
                )}

                {/* READY ACTIONS: COPY WATCH LINK & COPY EMBED CODE */}
                {item.status === "READY" && item.publicId && item.watchSlug && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>✔</span> HLS Adaptive Stream is Ready!
                      </span>
                      <Link
                        href={`/watch/${item.watchSlug}`}
                        target="_blank"
                        className="py-1 px-3 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        Watch Now →
                      </Link>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      {/* Copy Watch Link */}
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/watch/${item.watchSlug}`,
                            item.id,
                            "watch"
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-black/60 border border-white/10 hover:border-white/30 text-xs font-semibold text-zinc-200 transition text-center cursor-pointer"
                      >
                        {copyFeedback?.id === item.id && copyFeedback.type === "watch"
                          ? "✔ Watch Link Copied!"
                          : "📋 Copy Watch Link"}
                      </button>

                      {/* Copy Embed Link */}
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/embed/${item.publicId}`,
                            item.id,
                            "embed-link"
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-black/60 border border-white/10 hover:border-white/30 text-xs font-semibold text-zinc-200 transition text-center cursor-pointer"
                      >
                        {copyFeedback?.id === item.id && copyFeedback.type === "embed-link"
                          ? "✔ Embed URL Copied!"
                          : "🔗 Copy Embed URL"}
                      </button>

                      {/* Copy Embed Iframe Code */}
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `<iframe src="${window.location.origin}/embed/${item.publicId}" width="100%" height="500" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
                            item.id,
                            "iframe"
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl velora-gradient text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:opacity-90 transition text-center cursor-pointer"
                      >
                        {copyFeedback?.id === item.id && copyFeedback.type === "iframe"
                          ? "✔ Iframe Code Copied!"
                          : "⚡ Copy Embed Code (iframe)"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata Configuration Form */}
                {item.status === "PENDING" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id ? { ...f, title: e.target.value } : f
                            )
                          )
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#181822] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF3864]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Category
                      </label>
                      <select
                        value={item.categoryId}
                        onChange={(e) =>
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id ? { ...f, categoryId: e.target.value } : f
                            )
                          )
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#181822] border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-[#FF3864]"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Visibility
                      </label>
                      <select
                        value={item.visibility}
                        onChange={(e) =>
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id
                                ? { ...f, visibility: e.target.value as any }
                                : f
                            )
                          )
                        }
                        className="w-full h-8 px-2.5 rounded-lg bg-[#181822] border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-[#FF3864]"
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="UNLISTED">Unlisted (Accessible via Link)</option>
                        <option value="PRIVATE">Private (Admin only)</option>
                        <option value="PREMIUM">Premium Member Only</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id={`featured_${item.id}`}
                        checked={item.isFeatured}
                        onChange={(e) =>
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id ? { ...f, isFeatured: e.target.checked } : f
                            )
                          )
                        }
                        className="rounded accent-[#FF3864] cursor-pointer"
                      />
                      <label
                        htmlFor={`featured_${item.id}`}
                        className="text-xs text-zinc-300 font-semibold cursor-pointer"
                      >
                        Feature in Hero Banner
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
