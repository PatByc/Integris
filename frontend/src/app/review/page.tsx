import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AppHeader } from "@/components/AppHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const REVIEW_STATUSES = new Set(["needs_review", "validation_failed"]);

const STATUS_BADGE: Record<string, string> = {
  needs_review: "bg-purple-100 text-purple-700",
  validation_failed: "bg-orange-100 text-orange-700",
};

interface DocumentItem {
  id: string;
  filename: string;
  status: string;
  created_at: string;
}

export default async function ReviewQueuePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const token = session.access_token;

  const docsRes = await fetch(`${API_URL}/api/v1/documents?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const { items = [] } = docsRes.ok ? await docsRes.json() : { items: [] };
  const reviewDocs = (items as DocumentItem[]).filter((d) =>
    REVIEW_STATUSES.has(d.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Review queue</h1>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </Link>
        </div>
        {reviewDocs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500">No invoices awaiting review.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{doc.filename}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[doc.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {doc.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString("pl-PL")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/review/${doc.id}`}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
