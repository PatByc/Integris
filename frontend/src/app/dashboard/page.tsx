import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DocumentsTable } from "@/components/DocumentsTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function DashboardPage() {
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

  const docsRes = await fetch(`${API_URL}/api/v1/documents?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const { items: initialDocuments, total: initialTotal } =
    docsRes.ok ? await docsRes.json() : { items: [], total: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Integris</h1>
            <p className="text-sm text-gray-500">{company?.name}</p>
          </div>
          <Link
            href="/upload"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload invoice
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <DocumentsTable
          token={token}
          initialDocuments={initialDocuments}
          initialTotal={initialTotal}
        />
      </main>
    </div>
  );
}
