"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

interface ArchiveItem {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  ksef_number: string | null;
  seller_name: string | null;
  seller_nip: string | null;
  gross_total: number | null;
  has_xml: boolean;
}

interface ArchiveData {
  items: ArchiveItem[];
  total: number;
  accepted_count: number;
  rejected_count: number;
  storage_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPLN(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(value);
}

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

function getPaginationPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "…")[] = [];
  if (current <= 3) {
    pages.push(0, 1, 2, 3, "…", total - 1);
  } else if (current >= total - 4) {
    pages.push(0, "…", total - 4, total - 3, total - 2, total - 1);
  } else {
    pages.push(0, "…", current - 1, current, current + 1, "…", total - 1);
  }
  return pages;
}

export default function ArchivePage() {
  const t = useTranslations("Archive");
  const [data, setData] = useState<ArchiveData | null>(null);
  const [page, setPage] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(
    async (offset: number) => {
      if (!token) return;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      const res = await fetch(`${API_URL}/api/v1/documents/archive?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    },
    [token],
  );

  useEffect(() => {
    load(page * PAGE_SIZE);
  }, [load, page]);

  async function downloadPdf(item: ArchiveItem) {
    if (!token || downloading) return;
    setDownloading(`pdf-${item.id}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${item.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadXml(item: ArchiveItem) {
    if (!token || downloading) return;
    setDownloading(`xml-${item.id}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${item.id}/xml-export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${item.id}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const paginationPages = getPaginationPages(page, totalPages);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <Sidebar />

      <main className="ml-64 pt-24 px-8 pb-8">
        <div className="max-w-screen-xl mx-auto">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
              <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-blue-600 font-semibold text-sm shadow-sm">
                <Icon name="file_download" className="text-[20px]" />
                {t("exportCsv")}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm">
                <Icon name="refresh" className="text-[20px]" />
                {t("syncKsef")}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[t("colDate"), t("colKsefId"), t("colContractor"), t("colValue"), t("colStatus"), t("colDownloads")].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-700 ${i === 5 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center text-sm text-gray-400">
                      {data ? t("noArchived") : t("loading")}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[13px] text-gray-600">
                        {new Date(item.created_at).toLocaleDateString("pl-PL")}
                      </td>

                      <td className="px-4 py-3 font-mono text-[13px] text-blue-600">
                        {item.ksef_number ?? <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                          {item.seller_name ?? <span className="text-gray-400 italic">{t("unknownContractor")}</span>}
                        </div>
                        {item.seller_nip && (
                          <div className="text-xs text-gray-400 font-mono">NIP: {item.seller_nip}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[13px] font-bold text-gray-900">
                        {formatPLN(item.gross_total)}
                      </td>

                      <td className="px-4 py-3">
                        {item.status === "accepted" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            {t("statusAccepted")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-bold border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            {t("statusRejected")}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => downloadPdf(item)}
                            disabled={!!downloading}
                            title="Download PDF"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40"
                          >
                            <Icon name="picture_as_pdf" className="text-[22px]" />
                          </button>
                          {item.has_xml ? (
                            <button
                              onClick={() => downloadXml(item)}
                              disabled={!!downloading}
                              title="Download XML"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40"
                            >
                              <Icon name="data_object" className="text-[22px]" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-gray-200 cursor-not-allowed">
                              <Icon name="data_object" className="text-[22px]" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {t("showing")} <span className="font-bold">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data!.total)}</span> {t("of")}{" "}
                  <span className="font-bold">{data!.total.toLocaleString()}</span> {t("entries")}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <Icon name="chevron_left" className="text-[18px]" />
                  </button>
                  {paginationPages.map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                          p === page
                            ? "bg-blue-600 text-white font-bold"
                            : "border border-gray-200 bg-white hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p + 1}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <Icon name="chevron_right" className="text-[18px]" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stat cards — below the table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white border border-gray-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 shrink-0">
                <Icon name="verified" filled className="text-[24px]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("totalAccepted")}</p>
                <h3 className="text-2xl font-bold text-gray-900">{data ? data.accepted_count.toLocaleString() : "—"}</h3>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-700 shrink-0">
                <Icon name="error" filled className="text-[24px]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("totalRejected")}</p>
                <h3 className="text-2xl font-bold text-gray-900">{data ? data.rejected_count.toLocaleString() : "—"}</h3>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-xl flex items-center gap-4 shadow-sm relative overflow-hidden">
              <div className="z-10 relative">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("archivedStorage")}</p>
                <h3 className="text-2xl font-bold text-gray-900">{data ? formatBytes(data.storage_bytes) : "—"}</h3>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-blue-50 to-transparent flex items-center justify-end pr-4 pointer-events-none">
                <Icon name="cloud_done" filled className="text-blue-300 text-[64px] opacity-60" />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
