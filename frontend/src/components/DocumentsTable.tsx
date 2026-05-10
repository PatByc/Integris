"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RetryOcrButton } from "@/components/RetryOcrButton";
import { RetryExtractionButton } from "@/components/RetryExtractionButton";
import { StatusBadge } from "@/components/StatusBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_MS = 4000;
const PAGE_SIZE = 20;

const ALL_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "needs_review", label: "Needs review" },
  { value: "validation_failed", label: "Validation failed" },
  { value: "ocr_failed", label: "OCR failed" },
  { value: "extraction_failed", label: "Extraction failed" },
  { value: "xml_generated", label: "XML generated" },
  { value: "submission_pending", label: "Submission pending" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

function SubmitToKsefButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
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
      {loading ? "Submitting…" : "Submit to KSeF"}
    </button>
  );
}

function DownloadXmlButton({ documentId, token }: { documentId: string; token: string }) {
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
      Download XML
    </button>
  );
}

function DownloadUpoButton({ documentId, token }: { documentId: string; token: string }) {
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
      {loading ? "Loading…" : "Download UPO"}
    </button>
  );
}

function DeleteButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
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
          {loading ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
    >
      Delete
    </button>
  );
}

function RetrySubmissionButton({ documentId, token, onDone }: { documentId: string; token: string; onDone: () => void }) {
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
        throw new Error((data as { detail?: string }).detail ?? "Retry failed");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
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
        {loading ? "Retrying…" : "Retry submission"}
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "";

  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);

  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchPage = useCallback(async (p: number, filter: string, query: string) => {
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(p * PAGE_SIZE),
      });
      if (filter) params.set("status", filter);
      if (query) params.set("q", query);
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
  const prevFiltersRef = useRef({ q, statusFilter });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.q !== q || prev.statusFilter !== statusFilter) {
      prevFiltersRef.current = { q, statusFilter };
      setPage(0);
      fetchPage(0, statusFilter, q);
    }
  }, [q, statusFilter, fetchPage]);

  // Poll every 4s while any visible document is in a processing/pending state
  useEffect(() => {
    const id = setInterval(() => {
      if (!documents.some((d) => PROCESSING_STATUSES.has(d.status))) return;
      fetchPage(pageRef.current, statusFilter, q);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [documents, fetchPage, statusFilter, q]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchPage(newPage, statusFilter, q);
  }

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (documents.length === 0 && page === 0 && !statusFilter && !q) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
        <p className="text-gray-500">No invoices yet.</p>
        <Link href="/upload" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Upload your first PDF
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          Invoices
          {q && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              — results for &ldquo;{q}&rdquo;
            </span>
          )}
        </h2>
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
          <span className="text-sm text-gray-500">{total} total</span>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
          <p className="text-gray-500">
            {q ? `No documents match "${q}".` : "No documents match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const pct = STATUS_PROGRESS[doc.status] ?? 0;
                const isProcessing = PROCESSING_STATUSES.has(doc.status);
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
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
                            href={`/review/${doc.id}`}
                            className="rounded bg-purple-600 px-3 py-1 text-center text-xs font-medium text-white hover:bg-purple-700"
                          >
                            Review
                          </Link>
                        )}
                        {doc.status === "xml_generated" && (
                          <>
                            <DownloadXmlButton documentId={doc.id} token={token} />
                            <SubmitToKsefButton
                              documentId={doc.id}
                              token={token}
                              onDone={() => fetchPage(page, statusFilter, q)}
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
                            onDone={() => fetchPage(page, statusFilter, q)}
                          />
                        )}
                        <DeleteButton
                          documentId={doc.id}
                          token={token}
                          onDone={() => fetchPage(page, statusFilter, q)}
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
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            onClick={() => handlePageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
