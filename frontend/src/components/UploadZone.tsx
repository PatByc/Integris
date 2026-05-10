"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiUpload, ApiError } from "@/lib/api";

const MAX_SIZE = 25 * 1024 * 1024;

export function UploadZone() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File exceeds the 25 MB limit.");
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        await apiUpload("/api/v1/documents/upload", form);
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [router]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-16 transition-colors ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <svg
          className="h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Drag &amp; drop a PDF here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF only · max 25 MB</p>
        </div>
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={onInputChange}
          disabled={uploading}
        />
      </label>

      {uploading && (
        <p className="mt-3 text-center text-sm text-gray-600">Uploading…</p>
      )}
      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
