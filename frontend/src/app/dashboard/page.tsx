import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DocumentsTable } from "@/components/DocumentsTable";
import { AppHeader } from "@/components/AppHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const token = session.access_token;

  const companyRes = await fetch(`${API_URL}/api/v1/companies/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (companyRes.status === 404) {
    redirect("/company/setup");
  }

  const { company } = await companyRes.json();

  const { q = "", status = "" } = await searchParams;
  const params = new URLSearchParams({ limit: "20" });
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  const docsRes = await fetch(`${API_URL}/api/v1/documents?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const { items: initialDocuments, total: initialTotal } =
    docsRes.ok ? await docsRes.json() : { items: [], total: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">{company?.name}</p>
          <Link
            href="/upload"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload invoice
          </Link>
        </div>
        <Suspense>
          <DocumentsTable
            token={token}
            initialDocuments={initialDocuments}
            initialTotal={initialTotal}
          />
        </Suspense>
      </main>
    </div>
  );
}
