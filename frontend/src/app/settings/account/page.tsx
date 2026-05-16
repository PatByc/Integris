import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTranslations } from "next-intl/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function AccountPage() {
  const t = await getTranslations("Settings");
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session!.user;
  const userName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  let role = "";
  try {
    const res = await fetch(`${API_URL}/api/v1/companies/me`, {
      headers: { Authorization: `Bearer ${session!.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json() as { role?: string };
      role = data.role ?? "";
    }
  } catch {}

  function roleLabel(r: string): string {
    if (r === "admin") return t("roleAdmin");
    if (r === "member") return t("roleMember");
    if (r === "viewer") return t("roleViewer");
    return r;
  }

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("profile")}
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("displayName")}</dt>
            <dd className="text-sm font-medium text-gray-900">{userName}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("emailAddress")}</dt>
            <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
          </div>
          {role && (
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">{t("role")}</dt>
              <dd className="text-sm font-medium text-gray-900">
                {roleLabel(role)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("accountCreated")}</dt>
            <dd className="text-sm font-medium text-gray-900">
              {new Date(user.created_at).toLocaleDateString("pl-PL")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("security")}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{t("password")}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {t("lastChanged")}
            </p>
          </div>
          <button
            disabled
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
          >
            {t("changePassword")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-red-100 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-red-400">
          {t("dangerZone")}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{t("deleteAccount")}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {t("deleteAccountDesc")}
            </p>
          </div>
          <button
            disabled
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-300 cursor-not-allowed"
          >
            {t("deleteAccount")}
          </button>
        </div>
      </section>
    </>
  );
}
