"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DocsPerDay {
  date: string;
  count: number;
}

interface BentoStats {
  docs_per_day: DocsPerDay[];
  status_breakdown: Record<string, number>;
  storage_bytes: number;
  storage_quota_bytes: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_GROUPS = [
  { label: "Processing",      statuses: ["ocr_processing", "extraction_processing"], color: "bg-blue-400" },
  { label: "Needs Review",    statuses: ["needs_review"],                             color: "bg-amber-400" },
  { label: "Ready to Submit", statuses: ["approved", "xml_generated"],               color: "bg-indigo-400" },
  { label: "Submitted",       statuses: ["submission_pending", "submitted"],          color: "bg-purple-400" },
  { label: "Accepted",        statuses: ["accepted"],                                 color: "bg-green-500" },
  { label: "Failed",          statuses: ["ocr_failed", "extraction_failed", "rejected", "cancelled"], color: "bg-red-400" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function BentoSection({ token }: { token: string }) {
  const [stats, setStats] = useState<BentoStats | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`${API_URL}/api/v1/documents/bento-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setStats(data))
        .catch(() => {});

    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [token]);

  if (!stats) return null;

  const { docs_per_day, status_breakdown, storage_bytes } = stats;
  const maxCount = Math.max(...docs_per_day.map((d) => d.count), 1);
  const totalDocs = Object.values(status_breakdown).reduce((a, b) => a + b, 0);

  const pipelineRows = STATUS_GROUPS.map((g) => ({
    ...g,
    count: g.statuses.reduce((sum, s) => sum + (status_breakdown[s] ?? 0), 0),
  })).filter((g) => g.count > 0);

  return (
    <div className="mt-4 grid grid-cols-3 gap-4">
      {/* 7-day bar chart — spans 2 columns */}
      <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Documents — last 7 days
        </p>
        <div className="flex h-24 items-end gap-1.5">
          {docs_per_day.map(({ date, count }) => {
            const pct = Math.max(Math.round((count / maxCount) * 100), count > 0 ? 8 : 3);
            return (
              <div key={date} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: count > 0 ? "#2563eb" : "#e5e7eb",
                  }}
                  title={`${count} document${count !== 1 ? "s" : ""}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {docs_per_day.map(({ date }) => (
            <div key={date} className="flex-1 text-center text-xs text-gray-400">
              {DAY_LABELS[new Date(date + "T12:00:00").getDay()]}
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline + Storage — 1 column */}
      <div className="flex flex-col gap-4">
        {/* Pipeline breakdown */}
        <div className="flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pipeline</p>
          {pipelineRows.length === 0 ? (
            <p className="text-sm text-gray-400">No documents yet</p>
          ) : (
            <ul className="space-y-2">
              {pipelineRows.map((g) => (
                <li key={g.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${g.color}`} />
                    {g.label}
                  </span>
                  <span className="font-semibold text-gray-900">{g.count}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="font-semibold text-gray-900">{totalDocs}</span>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">PDF Storage</p>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(storage_bytes)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {stats.storage_quota_bytes > 0
              ? `${((storage_bytes / stats.storage_quota_bytes) * 100).toFixed(1)}% of ${formatBytes(stats.storage_quota_bytes)} quota`
              : "uploaded PDFs"}
          </p>
        </div>
      </div>
    </div>
  );
}
