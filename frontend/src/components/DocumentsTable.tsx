"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RetryOcrButton } from "@/components/RetryOcrButton";
import { RetryExtractionButton } from "@/components/RetryExtractionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_MS = 4000;
const PAGE_SIZE = 20;

function SubmitToKsefButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
  const t = useTranslations("DocumentsTable");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {loading ? t("submitting") : t("submitToKsef")}
    </button>
  );
}

function DownloadXmlButton({ documentId, token }: { documentId: string; token: string }) {
  const t = useTranslations("DocumentsTable");

  async function handleClick() {
    const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/xml-export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice_${documentId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleClick}
      className="rounded bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
    >
      {t("downloadXml")}
    </button>
  );
}

function DownloadUpoButton({ documentId, token }: { documentId: string; token: string }) {
  const t = useTranslations("DocumentsTable");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/upo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert("UPO not available (dry run mode or pending)");
        return;
      }
      const { upo_url } = await res.json() as { upo_url: string };
      window.open(upo_url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
    >
      {loading ? t("loading") : t("downloadUpo")}
    </button>
  );
}

function DeleteButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
  const t = useTranslations("DocumentsTable");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/v1/documents/${documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDone();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? t("deleting") : t("confirm")}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          {t("cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
    >
      {t("delete")}
    </button>
  );
}

function RetrySubmissionButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
  const t = useTranslations("DocumentsTable");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/retry-submission`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? t("retryFailed"));
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("retryFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? t("retrying") : t("retrySubmission")}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const PROCESSING_STATUSES = new Set([
  "ocr_processing",
  "extraction_processing",
  "submission_pending",
  "submitted",
]);

const STATUS_PROGRESS: Record<string, number> = {
  uploaded: 5,
  ocr_processing: 20,
  ocr_failed: 20,
  extraction_processing: 50,
  extraction_failed: 50,
  validation_failed: 65,
  needs_review: 70,
  approved: 80,
  xml_generated: 85,
  submission_pending: 90,
  submitted: 95,
  accepted: 100,
  rejected: 100,
  cancelled: 0,
};

function barColor(status: string): string {
  if (status === "accepted") return "bg-green-500";
  if (["approved", "xml_generated", "submitted"].includes(status)) return "bg-green-400";
  if (status.includes("failed") || status === "rejected") return "bg-red-400";
  if (status === "cancelled") return "bg-gray-300";
  if (PROCESSING_STATUSES.has(status)) return "bg-yellow-400";
  return "bg-blue-400";
}

interface DocumentItem {
  id: string;
  filename: string;
  file_size_bytes: number | null;
  status: string;
  created_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  token: string;
  initialDocuments: DocumentItem[];
  initialTotal: number;
}

export function DocumentsTable({ token, initialDocuments, initialTotal }: Props) {
  const t = useTranslations("DocumentsTable");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const dateRange = searchParams.get("date_range") ?? "";
  const explicitDateFrom = searchParams.get("date_from") ?? "";
  const explicitDateTo = searchParams.get("date_to") ?? "";

  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const pageRef = useRef(page);
  pageRef.current = page;

  const ALL_STATUSES = [
    { value: "", label: t("allStatuses") },
    { value: "needs_review", label: t("needsReview") },
    { value: "validation_failed", label: t("validationFailed") },
    { value: "ocr_failed", label: t("ocrFailed") },
    { value: "extraction_failed", label: t("extractionFailed") },
    { value: "xml_generated", label: t("xmlGenerated") },
    { value: "submission_pending", label: t("submissionPending") },
    { value: "submitted", label: t("submitted") },
    { value: "accepted", label: t("accepted") },
    { value: "rejected", label: t("rejected") },
  ];

  const fetchPage = useCallback(async (p: number, filter: string, query: string, range: string, dateFrom: string, dateTo: string) => {
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(p * PAGE_SIZE),
      });
      if (filter) params.set("status", filter);
      if (query) params.set("q", query);
      if (dateFrom) {
        params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
      } else if (range) {
        const days = parseInt(range);
        const df = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        params.set("date_from", df.toISOString().split("T")[0]);
      }
      const res = await fetch(`${API_URL}/api/v1/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { items: DocumentItem[]; total: number };
      setDocuments(data.items);
      setTotal(data.total);
    } catch {}
  }, [token]);

  // Refetch and reset page whenever URL filters change
  const prevFiltersRef = useRef({ q, statusFilter, dateRange, explicitDateFrom, explicitDateTo });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.q !== q || prev.statusFilter !== statusFilter || prev.dateRange !== dateRange || prev.explicitDateFrom !== explicitDateFrom || prev.explicitDateTo !== explicitDateTo) {
      prevFiltersRef.current = { q, statusFilter, dateRange, explicitDateFrom, explicitDateTo };
      setPage(0);
      fetchPage(0, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo);
    }
  }, [q, statusFilter, dateRange, explicitDateFrom, explicitDateTo, fetchPage]);

  // Poll every 4s while any visible document is in a processing/pending state
  useEffect(() => {
    const id = setInterval(() => {
      if (!documents.some((d) => PROCESSING_STATUSES.has(d.status))) return;
      fetchPage(pageRef.current, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [documents, fetchPage, statusFilter, q, dateRange]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchPage(newPage, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo);
  }

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value); else params.delete("status");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleDateRangeChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("date_range", value); else params.delete("date_range");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allChecked = documents.length > 0 && documents.every((d) => checkedIds.has(d.id));

  if (documents.length === 0 && page === 0 && !statusFilter && !q) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
        <p className="text-gray-500">{t("noInvoices")}</p>
        <Link href="/upload" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          {t("uploadFirst")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Table header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("allTime")}</option>
              <option value="7">{t("last7Days")}</option>
              <option value="30">{t("last30Days")}</option>
            </select>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-sm text-gray-400">
              {t("showing", { count: documents.length, total })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("exportReport")}
            </button>
            <button
              disabled
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-1.5 rounded bg-blue-300 px-3 py-1.5 text-sm font-medium text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t("uploadBatch")}
            </button>
          </div>
        </div>

      {documents.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            {q ? t("noMatch", { q }) : t("noMatchFilter")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => setCheckedIds(allChecked ? new Set() : new Set(documents.map((d) => d.id)))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">{t("filename")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("size")}</th>
                <th className="px-4 py-3">{t("uploaded")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const pct = STATUS_PROGRESS[doc.status] ?? 0;
                const isProcessing = PROCESSING_STATUSES.has(doc.status);
                return (
                  <tr key={doc.id} className={`hover:bg-gray-50 ${checkedIds.has(doc.id) ? "bg-blue-50/40" : ""}`}>
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(doc.id)}
                        onChange={() => toggleCheck(doc.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{doc.filename}</td>
                    <td className="px-4 py-3">
                      <StatusBadge documentId={doc.id} status={doc.status} />
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor(doc.status)} ${isProcessing ? "animate-pulse" : ""}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatBytes(doc.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="block">{new Date(doc.created_at).toLocaleDateString("pl-PL")}</span>
                      <span className="block text-xs text-gray-400">
                        {new Date(doc.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {doc.status === "ocr_failed" && (
                          <RetryOcrButton documentId={doc.id} token={token} />
                        )}
                        {doc.status === "extraction_failed" && (
                          <RetryExtractionButton documentId={doc.id} token={token} />
                        )}
                        {(doc.status === "needs_review" || doc.status === "validation_failed") && (
                          <Link
                            href={`/validation/${doc.id}`}
                            className="rounded bg-purple-600 px-3 py-1 text-center text-xs font-medium text-white hover:bg-purple-700"
                          >
                            {t("review")}
                          </Link>
                        )}
                        {doc.status === "xml_generated" && (
                          <>
                            <DownloadXmlButton documentId={doc.id} token={token} />
                            <SubmitToKsefButton
                              documentId={doc.id}
                              token={token}
                              onDone={() => fetchPage(page, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo)}
                            />
                          </>
                        )}
                        {doc.status === "accepted" && (
                          <DownloadUpoButton documentId={doc.id} token={token} />
                        )}
                        {doc.status === "rejected" && (
                          <RetrySubmissionButton
                            documentId={doc.id}
                            token={token}
                            onDone={() => fetchPage(page, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo)}
                          />
                        )}
                        <DeleteButton
                          documentId={doc.id}
                          token={token}
                          onDone={() => fetchPage(page, statusFilter, q, dateRange, explicitDateFrom, explicitDateTo)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          <button
            onClick={() => handlePageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          >
            {t("previous")}
          </button>
          <span>
            {t("page", { page: page + 1, total: totalPages })}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          >
            {t("next")}
          </button>
        </div>
      )}
      </div>
    </>
  );
}
