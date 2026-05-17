"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface QueueItem {
  id: string;
  filename: string;
  status: string;
  updated_at: string;
  seller_name: string | null;
  seller_nip: string | null;
  invoice_number: string | null;
  gross_total: number | null;
}

interface QueueData {
  items: QueueItem[];
  total: number;
  total_value: number;
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

// Minimal FA(3) XML syntax highlighter — no external deps
function XmlViewer({ xml }: { xml: string }) {
  const tokenize = (raw: string) => {
    const result: { type: string; text: string }[] = [];
    // Regex matches: processing instructions, opening tags (with attrs), closing tags, self-closing, text
    const re = /<\?[^?]*\?>|<\/[\w:]+>|<[\w:]+(?:\s[^>]*)?>|[^<]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const t = m[0];
      if (t.startsWith("<?")) {
        result.push({ type: "pi", text: t });
      } else if (t.startsWith("</")) {
        result.push({ type: "close-tag", text: t });
      } else if (t.startsWith("<")) {
        // Split opening tag into tag name + attributes
        const attrRe = /(<[\w:]+)((?:\s[\w:]+="[^"]*")*)(\/?>)/;
        const am = attrRe.exec(t);
        if (am) {
          result.push({ type: "open-tag", text: am[1] });
          if (am[2]) {
            // parse individual attr=val pairs
            const pairRe = /\s([\w:]+)="([^"]*)"/g;
            let pm: RegExpExecArray | null;
            while ((pm = pairRe.exec(am[2])) !== null) {
              result.push({ type: "attr-name", text: ` ${pm[1]}` });
              result.push({ type: "attr-eq", text: `=` });
              result.push({ type: "attr-val", text: `"${pm[2]}"` });
            }
          }
          result.push({ type: "open-tag", text: am[3] });
        } else {
          result.push({ type: "open-tag", text: t });
        }
      } else {
        result.push({ type: "text", text: t });
      }
    }
    return result;
  };

  const tokens = tokenize(xml);

  return (
    <pre className="font-mono text-[13px] leading-relaxed overflow-auto whitespace-pre-wrap break-all p-5 h-full">
      {tokens.map((tok, i) => {
        if (tok.type === "pi" || tok.type === "open-tag" || tok.type === "close-tag")
          return <span key={i} className="text-blue-600">{tok.text}</span>;
        if (tok.type === "attr-name")
          return <span key={i} className="text-slate-500">{tok.text}</span>;
        if (tok.type === "attr-eq")
          return <span key={i} className="text-slate-400">{tok.text}</span>;
        if (tok.type === "attr-val")
          return <span key={i} className="text-slate-700">{tok.text}</span>;
        return <span key={i} className="text-gray-800">{tok.text}</span>;
      })}
    </pre>
  );
}

export default function KsefPage() {
  const t = useTranslations("Ksef");
  const [data, setData] = useState<QueueData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/v1/documents/submission-queue`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setData(await res.json());
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch XML when selection changes
  useEffect(() => {
    if (!selectedId || !token) { setXmlContent(null); return; }
    setXmlLoading(true);
    setXmlContent(null);
    fetch(`${API_URL}/api/v1/documents/${selectedId}/xml-export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setXmlContent(text))
      .catch(() => setXmlContent(null))
      .finally(() => setXmlLoading(false));
  }, [selectedId, token]);

  async function submitDoc(item: QueueItem) {
    if (!token || submitting) return;
    setSubmitting(item.id);
    try {
      const endpoint = item.status === "rejected"
        ? `${API_URL}/api/v1/documents/${item.id}/retry-submission`
        : `${API_URL}/api/v1/documents/${item.id}/submit`;
      const res = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        // Remove from local list
        setData((prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((d) => d.id !== item.id);
          const total_value = items
            .filter((d) => d.status === "xml_generated")
            .reduce((sum, d) => sum + (d.gross_total ?? 0), 0);
          return { ...prev, items, total: items.length, total_value };
        });
        if (selectedId === item.id) { setSelectedId(null); setXmlContent(null); }
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function downloadXml() {
    if (!selectedId || !token) return;
    const res = await fetch(`${API_URL}/api/v1/documents/${selectedId}/xml-export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice_${selectedId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyXml() {
    if (!xmlContent) return;
    await navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const items = data?.items ?? [];
  const readyCount = items.filter((d) => d.status === "xml_generated").length;
  const selectedItem = items.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <Sidebar />

      <main className="ml-64 pt-20 px-6 pb-6 h-screen overflow-hidden flex flex-col">
        {/* Page header */}
        <div className="flex items-end justify-between py-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>

        {/* Two-panel grid */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

          {/* LEFT — queue list */}
          <div className="col-span-4 flex flex-col gap-3 min-h-0">

            {/* Stats card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{t("readyToSubmit")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{t("batchCount")}</p>
                  <p className="text-2xl font-bold text-blue-600">{data ? readyCount : "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{t("totalValue")}</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{data ? formatPLN(data.total_value) : "—"}</p>
                </div>
              </div>
              {readyCount > 0 && (
                <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                  <Icon name="verified" className="text-[14px] text-blue-500" />
                  {t("validationPassed")}
                </p>
              )}
            </div>

            {/* Invoice list */}
            <div className="bg-white border border-gray-200 rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("invoiceQueue")}</span>
                <Icon name="filter_list" className="text-[18px] text-gray-400" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400">
                    <Icon name="inbox" className="text-[40px] mb-2 text-gray-200" />
                    <p className="text-sm">{data ? t("noInvoices") : t("loading")}</p>
                  </div>
                ) : (
                  items.map((item) => {
                    const isSelected = item.id === selectedId;
                    const isReady = item.status === "xml_generated";
                    const isSubmitting = submitting === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`px-4 py-3 cursor-pointer transition-colors flex flex-col gap-1 ${
                          isSelected
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "hover:bg-gray-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? "text-blue-600" : "text-gray-600"}`}>
                            {item.invoice_number ?? item.filename}
                          </span>
                          <span className="font-mono text-[12px] text-gray-700 shrink-0">{formatPLN(item.gross_total)}</span>
                        </div>
                        <p className="text-sm text-gray-800 truncate">{item.seller_name ?? <span className="italic text-gray-400">{t("unknownContractor")}</span>}</p>
                        {item.seller_nip && (
                          <p className="text-[10px] text-gray-400 font-mono">NIP: {item.seller_nip}</p>
                        )}
                        <div className="flex items-center justify-between mt-1 gap-2">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-green-600" /> {t("badgeReady")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-red-600" /> {t("badgeRejected")}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); submitDoc(item); }}
                            disabled={!!submitting}
                            className={`text-[10px] font-semibold px-3 py-1 rounded-md transition-colors disabled:opacity-40 ${
                              isReady
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
                            }`}
                          >
                            {isSubmitting ? "…" : isReady ? t("submit") : t("retry")}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — XML preview */}
          <div className="col-span-8 flex flex-col gap-3 min-h-0">
            <div className="bg-white border border-gray-200 rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">

              {/* Tab bar + toolbar */}
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 shadow-sm">
                    {t("tabXml")}
                  </button>
                  <button
                    disabled
                    title="Coming soon"
                    className="px-3 py-1.5 text-[11px] font-semibold text-gray-300 cursor-not-allowed"
                  >
                    {t("tabVisual")}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyXml}
                    disabled={!xmlContent}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                  >
                    <Icon name="content_copy" className="text-[16px]" />
                    {copied ? t("copied") : t("copyXml")}
                  </button>
                  <button
                    onClick={downloadXml}
                    disabled={!xmlContent}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                  >
                    <Icon name="download" className="text-[16px]" />
                    {t("export")}
                  </button>
                </div>
              </div>

              {/* XML content area */}
              <div className="flex-1 overflow-auto bg-white">
                {!selectedId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 py-20">
                    <Icon name="code" className="text-[56px] mb-3" />
                    <p className="text-sm text-gray-400">{t("selectInvoice")}</p>
                  </div>
                ) : xmlLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    {t("loadingXml")}
                  </div>
                ) : xmlContent ? (
                  <div className="border-l-2 border-gray-100 ml-4 h-full">
                    <XmlViewer xml={xmlContent} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    {t("xmlUnavailable")}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Schema: FA(3) v1.0</span>
                  </div>
                  {selectedItem && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[240px]">{selectedItem.filename}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Icon name="lock" className="text-[14px]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t("securedEncryption")}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
