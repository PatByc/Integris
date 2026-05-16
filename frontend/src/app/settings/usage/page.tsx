"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PLAN_ORDER = ["testing", "starter", "growth", "enterprise"] as const;
type Plan = (typeof PLAN_ORDER)[number];

interface MeData {
  company: {
    plan_type: string;
    docs_uploaded_this_month: number;
    monthly_reset_at: string;
  };
  monthly_limit: number;
}

const PLAN_NAME: Record<Plan, string> = {
  testing: "planTesting",
  starter: "planStarter",
  growth: "planGrowth",
  enterprise: "planEnterprise",
};

const PLAN_DESC: Record<Plan, string> = {
  testing: "planDescTesting",
  starter: "planDescStarter",
  growth: "planDescGrowth",
  enterprise: "planDescEnterprise",
};

export default function UsagePage() {
  const t = useTranslations("Settings");
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${API_URL}/api/v1/companies/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const plan = (data?.company.plan_type ?? "testing") as Plan;
  const used = data?.company.docs_uploaded_this_month ?? 0;
  const limit = data?.monthly_limit ?? 25;
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const resetDate = data?.company.monthly_reset_at
    ? (() => {
        const d = new Date(data.company.monthly_reset_at);
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
      })()
    : "—";

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">{t("usageTitle")}</h2>

      {/* Plan + usage */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("currentPlan")}
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {t(PLAN_NAME[plan] as Parameters<typeof t>[0])}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {t(PLAN_DESC[plan] as Parameters<typeof t>[0])}
            </p>
          </div>
          {plan !== "enterprise" && (
            <Link
              href="/pricing"
              className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t("upgradePlan" as Parameters<typeof t>[0])}
            </Link>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("monthlyUsage")}
            </p>
            <p className="text-sm text-gray-700">
              {unlimited
                ? t("docsUsedUnlimited", { used })
                : t("docsUsed", { used, limit })}
            </p>
          </div>

          {!unlimited && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full transition-all ${
                  pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <p className="mt-2 text-xs text-gray-400">
            {t("resetsOn")} {resetDate}
          </p>

          {!unlimited && pct >= 80 && (
            <p className="mt-3 text-sm text-amber-700">{t("upgradeNotice")}</p>
          )}

          {plan === "enterprise" && (
            <p className="mt-3 text-xs text-gray-400">{t("contactSales")}</p>
          )}
        </div>
      </div>

      {/* Plan ladder */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("availablePlans")}
        </p>
        <div className="space-y-2">
          {PLAN_ORDER.map((p) => {
            const isCurrent = p === plan;
            return (
              <div
                key={p}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  isCurrent ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-white"
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${isCurrent ? "text-blue-700" : "text-gray-900"}`}>
                    {t(PLAN_NAME[p] as Parameters<typeof t>[0])}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t(PLAN_DESC[p] as Parameters<typeof t>[0])}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {t("currentPlan")}
                  </span>
                ) : (
                  plan !== "enterprise" && PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(plan) && (
                    <Link
                      href="/pricing"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {t("upgradePlan" as Parameters<typeof t>[0])} →
                    </Link>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
