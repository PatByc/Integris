"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { apiGet } from "@/lib/api";

const ERROR_META: Record<string, { label: string; critical: boolean }> = {
  invalid_seller_nip:           { label: "Invalid seller NIP",    critical: true },
  invalid_buyer_nip:            { label: "Invalid buyer NIP",     critical: true },
  totals_mismatch:              { label: "Totals mismatch",       critical: true },
  line_items_total_mismatch:    { label: "Line items mismatch",   critical: true },
  required_seller_name:         { label: "Missing seller name",   critical: false },
  required_seller_nip:          { label: "Missing seller NIP",   critical: false },
  required_buyer_name:          { label: "Missing buyer name",    critical: false },
  required_invoice_number:      { label: "Missing invoice no.",   critical: false },
  required_issue_date:          { label: "Missing issue date",    critical: false },
  required_gross_total:         { label: "Missing total",         critical: false },
  future_issue_date:            { label: "Future date",           critical: false },
  payment_before_issue_date:    { label: "Payment date error",    critical: false },
  invalid_vat_rate:             { label: "Invalid VAT rate",      critical: false },
};

function errorLabel(rule: string | null): { label: string; critical: boolean } {
  if (!rule) return { label: "No errors", critical: false };
  return ERROR_META[rule] ?? { label: rule.replace(/_/g, " "), critical: false };
}

interface QueueItem {
  id: string;
  filename: string;
  status: string;
  seller_name: string | null;
  confidence: number | null;
  error_count: number;
  first_error_rule: string | null;
  created_at: string;
}

interface QueueData {
  items: QueueItem[];
  pending_count: number;
  total_errors: number;
  avg_confidence: number | null;
  error_free_count: number;
}

function StatCard({ label, value, sub, valueClass }: {
  label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold text-gray-900 ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function ValidationPage() {
  const [data, setData] = useState<QueueData | null>(null);

  useEffect(() => {
    const load = () =>
      apiGet<QueueData>("/api/v1/documents/validation-queue")
        .then(setData)
        .catch(() => {});

    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validation Queue</h1>
            {data && (
              <p className="mt-1 text-sm text-gray-500">
                {data.pending_count === 0
                  ? "Queue is clear"
                  : <>Manual review required for{" "}
                    <span className="font-semibold text-red-600">{data.pending_count} invoice{data.pending_count !== 1 ? "s" : ""}</span>
                  </>}
              </p>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <StatCard
            label="In Queue"
            value={data ? String(data.pending_count) : "—"}
            sub="needs review"
          />
          <StatCard
            label="Total Issues"
            value={data ? String(data.total_errors) : "—"}
            sub="validation errors"
            valueClass={data && data.total_errors > 0 ? "text-red-600" : ""}
          />
          <StatCard
            label="Avg Confidence"
            value={data?.avg_confidence != null ? `${Math.round(data.avg_confidence * 100)}%` : "—"}
            sub="AI extraction score"
          />
          <StatCard
            label="Error-free"
            value={data ? String(data.error_free_count) : "—"}
            sub="ready to approve"
            valueClass={data && data.error_free_count > 0 ? "text-green-600" : ""}
          />
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-sm font-medium text-gray-500">
              {data ? "Queue is clear — no invoices need review" : "Loading…"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((doc) => {
                  const { label, critical } = errorLabel(doc.first_error_rule);
                  const pct = doc.confidence != null ? Math.round(doc.confidence * 100) : null;
                  const hasErrors = doc.error_count > 0;

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      {/* Filename */}
                      <td className="px-4 py-3">
                        <span className="block font-medium text-gray-900 truncate max-w-[180px]">
                          {doc.filename}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {doc.id.slice(0, 8)}…
                        </span>
                      </td>

                      {/* Seller */}
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[140px]">
                        {doc.seller_name ?? <span className="text-gray-400 italic">unknown</span>}
                      </td>

                      {/* Error badge */}
                      <td className="px-4 py-3">
                        {hasErrors ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            critical
                              ? "border border-red-200 bg-red-50 text-red-700"
                              : "border border-amber-200 bg-amber-50 text-amber-700"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${critical ? "bg-red-500" : "bg-amber-500"}`} />
                            {label}
                            {doc.error_count > 1 && (
                              <span className="ml-0.5 opacity-60">+{doc.error_count - 1}</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Clean
                          </span>
                        )}
                      </td>

                      {/* Confidence bar */}
                      <td className="px-4 py-3">
                        {pct != null ? (
                          <>
                            <div className="mb-0.5 h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-medium ${pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                              {pct}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString("pl-PL")}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/validation/${doc.id}`}
                          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
