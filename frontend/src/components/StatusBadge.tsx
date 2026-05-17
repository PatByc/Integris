"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { useTranslations } from "next-intl";

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

const EVENT_KEY_MAP: Record<string, string> = {
  "document.uploaded":          "eventDocumentUploaded",
  "ocr.started":                "eventOcrStarted",
  "ocr.succeeded":              "eventOcrSucceeded",
  "ocr.failed":                 "eventOcrFailed",
  "ocr.retry_requested":        "eventOcrRetry",
  "extraction.started":         "eventExtractionStarted",
  "extraction.succeeded":       "eventExtractionSucceeded",
  "extraction.failed":          "eventExtractionFailed",
  "extraction.retry_requested": "eventExtractionRetry",
  "review.approved":            "eventReviewApproved",
  "xml_generation.succeeded":   "eventXmlSucceeded",
  "xml_generation.failed":      "eventXmlFailed",
  "ksef.submission.requested":  "eventSubmissionRequested",
  "ksef.submission.succeeded":  "eventSubmissionSucceeded",
  "ksef.submission.failed":     "eventSubmissionFailed",
  "ksef.upo.accepted":          "eventUpoAccepted",
  "ksef.upo.rejected":          "eventUpoRejected",
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
  const t = useTranslations("StatusBadge");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHistory(null);
    setOpen(false);
  }, [status]);

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
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPopupPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as (key: string) => string;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={toggle}
        title={t("clickHistory")}
        className={`cursor-pointer rounded px-2 py-0.5 text-xs font-medium ring-offset-1 transition-all hover:ring-2 hover:ring-current hover:ring-offset-1 ${STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600"}`}
      >
        {status.replace(/_/g, " ")}
      </button>

      {open && (
        <div
          className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t("statusHistory")}
          </p>
          {loading && <p className="px-3 py-1 text-xs text-gray-400">{t("loading")}</p>}
          {!loading && history?.length === 0 && (
            <p className="px-3 py-1 text-xs text-gray-400">{t("noHistory")}</p>
          )}
          {!loading && history && history.length > 0 && (
            <ul>
              {history.map((ev, i) => {
                const d = new Date(ev.created_at);
                const key = EVENT_KEY_MAP[ev.event_type];
                const label = key ? tAny(key) : ev.event_type;
                return (
                  <li key={i} className="flex items-baseline justify-between gap-2 px-3 py-1">
                    <span className="flex items-center gap-1.5 text-xs text-gray-700">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      {label}
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
