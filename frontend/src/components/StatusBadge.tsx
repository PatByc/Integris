"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

const STATUS_BADGE: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-700",
  ocr_processing: "bg-yellow-100 text-yellow-700",
  ocr_failed: "bg-red-100 text-red-700",
  extraction_processing: "bg-yellow-100 text-yellow-700",
  extraction_failed: "bg-red-100 text-red-700",
  validation_failed: "bg-orange-100 text-orange-700",
  needs_review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  xml_generated: "bg-teal-100 text-teal-700",
  submission_pending: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const EVENT_LABELS: Record<string, string> = {
  "document.uploaded": "Uploaded",
  "ocr.started": "OCR started",
  "ocr.succeeded": "OCR done",
  "ocr.failed": "OCR failed",
  "ocr.retry_requested": "OCR retry",
  "extraction.started": "Extraction started",
  "extraction.succeeded": "Extraction done",
  "extraction.failed": "Extraction failed",
  "extraction.retry_requested": "Extraction retry",
  "review.approved": "Approved",
  "xml_generation.succeeded": "XML generated",
  "xml_generation.failed": "XML failed",
};

interface HistoryEvent {
  event_type: string;
  created_at: string;
}

interface Props {
  documentId: string;
  status: string;
}

export function StatusBadge({ documentId, status }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (history !== null) return;
    setLoading(true);
    try {
      const data = await apiGet<HistoryEvent[]>(`/api/v1/documents/${documentId}/history`);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={toggle}
        title="Click to see status history"
        className={`cursor-pointer rounded px-2 py-0.5 text-xs font-medium ring-offset-1 transition-all hover:ring-2 hover:ring-current hover:ring-offset-1 ${STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600"}`}
      >
        {status.replace(/_/g, " ")}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Status history
          </p>
          {loading && <p className="px-3 py-1 text-xs text-gray-400">Loading…</p>}
          {!loading && history?.length === 0 && (
            <p className="px-3 py-1 text-xs text-gray-400">No history yet.</p>
          )}
          {!loading && history && history.length > 0 && (
            <ul>
              {history.map((ev, i) => {
                const d = new Date(ev.created_at);
                return (
                  <li key={i} className="flex items-baseline justify-between gap-2 px-3 py-1">
                    <span className="flex items-center gap-1.5 text-xs text-gray-700">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-gray-400">
                      {d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}{" "}
                      {d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
