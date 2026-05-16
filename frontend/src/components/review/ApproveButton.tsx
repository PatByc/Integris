"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";
import { useTranslations } from "next-intl";

interface Props {
  documentId: string;
  role: string;
  hasErrors: boolean;
}

export function ApproveButton({ documentId, role, hasErrors }: Props) {
  const t = useTranslations("Review");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isViewer = role === "viewer";
  const disabled = isViewer || hasErrors || loading;

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/v1/documents/${documentId}/approve`, {});
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("approvalFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleApprove}
        disabled={disabled}
        className="w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? t("approving") : t("approveInvoice")}
      </button>
      {isViewer && (
        <p className="text-xs text-gray-500">{t("viewerCannotApprove")}</p>
      )}
      {hasErrors && !isViewer && (
        <p className="text-xs text-gray-500">{t("resolveErrors")}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
