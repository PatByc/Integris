import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  member: "Member",
  viewer: "Viewer",
};

export default async function OrganizationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}/api/v1/companies/me`, {
    headers: { Authorization: `Bearer ${session!.access_token}` },
    cache: "no-store",
  });

  if (res.status === 404) redirect("/company/setup");

  const { company, role } = (await res.json()) as {
    company: { id: string; name: string; nip: string; created_at: string };
    role: string;
  };

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Company details
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Company name</dt>
            <dd className="text-sm font-medium text-gray-900">{company.name}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">NIP</dt>
            <dd className="font-mono text-sm font-medium text-gray-900">{company.nip}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Company ID</dt>
            <dd className="font-mono text-xs text-gray-400">{company.id}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Registered</dt>
            <dd className="text-sm font-medium text-gray-900">
              {new Date(company.created_at).toLocaleDateString("pl-PL")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Team
          </h2>
          <button
            disabled
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
          >
            Invite member
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {session!.user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {session!.user.email}
            </p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[role] ?? role}</p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            You
          </span>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Member management will be available in a future release.
        </p>
      </section>
    </>
  );
}
