import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DocumentsTable } from "@/components/DocumentsTable";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { DashboardStats } from "@/components/DashboardStats";
import { BentoSection } from "@/components/BentoSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; date_range?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const token = session.access_token;

  const { q = "", status = "", date_range = "" } = await searchParams;
  const params = new URLSearchParams({ limit: "20" });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (date_range) {
    const days = parseInt(date_range);
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    params.set("date_from", dateFrom.toISOString().split("T")[0]);
  }

  const headers = { Authorization: `Bearer ${token}` };
  const [companyRes, docsRes, statsRes] = await Promise.all([
    fetch(`${API_URL}/api/v1/companies/me`, { headers, cache: "no-store" }),
    fetch(`${API_URL}/api/v1/documents?${params}`, { headers, cache: "no-store" }),
    fetch(`${API_URL}/api/v1/documents/stats`, { headers, cache: "no-store" }),
  ]);

  if (companyRes.status === 404) {
    redirect("/company/setup");
  }

  const { company } = await companyRes.json();

  const { items: initialDocuments, total: initialTotal } =
    docsRes.ok ? await docsRes.json() : { items: [], total: 0 };

  const stats = statsRes.ok ? await statsRes.json() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <Suspense><Sidebar /></Suspense>

      <main className="mx-auto max-w-5xl px-6 py-8 pl-20">

        {stats && (
          <DashboardStats
            pendingReview={stats.pending_review}
            awaitingSubmission={stats.awaiting_submission}
            awaitingSubmissionGrossTotal={stats.awaiting_submission_gross_total}
            ocrSuccessRate={stats.ocr_success_rate}
          />
        )}

        <Suspense>
          <DocumentsTable
            token={token}
            initialDocuments={initialDocuments}
            initialTotal={initialTotal}
          />
        </Suspense>

        <BentoSection token={token} />
      </main>
    </div>
  );
}
