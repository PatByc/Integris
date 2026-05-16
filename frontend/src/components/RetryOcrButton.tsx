"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RetryOcrButtonProps {
  documentId: string;
  token: string;
}

export function RetryOcrButton({ documentId, token }: RetryOcrButtonProps) {
  const t = useTranslations("DocumentsTable");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/retry-ocr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? t("retryFailed"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("retryFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRetry}
        disabled={loading}
        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? t("retrying") : t("retryOcr")}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
