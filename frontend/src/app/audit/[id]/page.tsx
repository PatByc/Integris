import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AppHeader } from "@/components/AppHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuditEvent {
  event_type: string;
  created_at: string;
  user_id: string | null;
  event_metadata: Record<string, unknown>;
}

interface DocumentOut {
  id: string;
  filename: string;
  status: string;
}

// ── Human-readable labels ─────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  "document.uploaded":           "Invoice uploaded",
  "ocr.started":                 "OCR processing started",
  "ocr.completed":               "OCR completed",
  "ocr.failed":                  "OCR failed",
  "ocr.retry_requested":         "OCR retry requested",
  "extraction.started":          "AI extraction started",
  "extraction.completed":        "AI extraction completed",
  "extraction.failed":           "AI extraction failed",
  "extraction.retry_requested":  "Extraction retry requested",
  "validation.completed":        "Validation completed",
  "review.correction_saved":     "Corrections saved",
  "review.approved":             "Invoice approved",
  "xml_generation.succeeded":    "FA(3) XML generated",
  "xml_generation.failed":       "XML generation failed",
  "ksef.submission.requested":   "KSeF submission requested",
  "ksef.submission.accepted":    "KSeF accepted",
  "ksef.submission.rejected":    "KSeF rejected",
  "ksef.upo.received":           "UPO received",
};

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/[._]/g, " ");
}

// ── Dot colour ────────────────────────────────────────────────────────────────

function dotClass(type: string): string {
  if (/failed|rejected/.test(type))  return "bg-red-500";
  if (/completed|succeeded|accepted|approved|uploaded|upo/.test(type)) return "bg-green-500";
  if (/requested|retry|correction/.test(type)) return "bg-blue-500";
  return "bg-gray-400";
}

// ── Metadata summary ──────────────────────────────────────────────────────────

function MetaSummary({ meta }: { meta: Record<string, unknown> }) {
  const lines: string[] = [];

  if (meta.error)         lines.push(`Error: ${meta.error}`);
  if (meta.attempt)       lines.push(`Attempt: ${meta.attempt}`);
  if (meta.content_hash)  lines.push(`SHA-256: ${String(meta.content_hash).slice(0, 16)}…`);
  if (meta.size_bytes)    lines.push(`Size: ${Number(meta.size_bytes).toLocaleString()} bytes`);
  if (meta.line_item_count !== undefined) lines.push(`Line items: ${meta.line_item_count}`);
  if (meta.retry === true) lines.push("Retry");

  if (lines.length === 0) return null;
  return (
    <p className="mt-0.5 text-xs text-gray-400">{lines.join(" · ")}</p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  const [docRes, historyRes] = await Promise.all([
    fetch(`${API_URL}/api/v1/documents/${id}`,         { headers, cache: "no-store" }),
    fetch(`${API_URL}/api/v1/documents/${id}/history`, { headers, cache: "no-store" }),
  ]);

  if (!docRes.ok) redirect("/dashboard");

  const doc: DocumentOut = await docRes.json();
  const events: AuditEvent[] = historyRes.ok ? await historyRes.json() : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">Document history</h1>
            <p className="mt-0.5 text-sm text-gray-500 truncate max-w-sm">{doc.filename}</p>
            <p className="font-mono text-xs text-gray-400">{id}</p>
          </div>
          <Link
            href={`/review/${id}`}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            ← Back to review
          </Link>
        </div>

        {/* Timeline */}
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">No events recorded yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-6">
            <ol className="relative">
              {events.map((ev, i) => (
                <li key={i} className="flex gap-4">
                  {/* Dot + connector line */}
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass(ev.event_type)}`} />
                    {i < events.length - 1 && (
                      <span className="mt-1 flex-1 w-px bg-gray-200" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 min-w-0 ${i === events.length - 1 ? "pb-0" : ""}`}>
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {eventLabel(ev.event_type)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ev.created_at).toLocaleString("pl-PL", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </p>
                    <MetaSummary meta={ev.event_metadata} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
