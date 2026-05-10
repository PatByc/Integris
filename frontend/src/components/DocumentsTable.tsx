"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RetryOcrButton } from "@/components/RetryOcrButton";
import { RetryExtractionButton } from "@/components/RetryExtractionButton";
import { StatusBadge } from "@/components/StatusBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_MS = 4000;

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

const PROCESSING_STATUSES = new Set([
  "ocr_processing",
  "extraction_processing",
  "submission_pending",
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
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const docsRef = useRef(documents);
  docsRef.current = documents;

  useEffect(() => {
    const id = setInterval(async () => {
      if (!docsRef.current.some((d) => PROCESSING_STATUSES.has(d.status))) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/documents?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as { items: DocumentItem[]; total: number };
        setDocuments(data.items);
        setTotal(data.total);
      } catch {}
    }, POLL_MS);
    return () => clearInterval(id);
  }, [token]);

  if (documents.length === 0) {
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>
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
                    {doc.status === "ocr_failed" && (
                      <RetryOcrButton documentId={doc.id} token={token} />
                    )}
                    {doc.status === "extraction_failed" && (
                      <RetryExtractionButton documentId={doc.id} token={token} />
                    )}
                    {(doc.status === "needs_review" || doc.status === "validation_failed") && (
                      <Link
                        href={`/review/${doc.id}`}
                        className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
                      >
                        Review
                      </Link>
                    )}
                    {doc.status === "xml_generated" && (
                      <DownloadXmlButton documentId={doc.id} token={token} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
