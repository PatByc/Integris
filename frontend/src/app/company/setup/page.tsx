"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "@/logo.png";
import { apiPost, ApiError } from "@/lib/api";
import { useTranslations } from "next-intl";

export default function CompanySetupPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [planType, setPlanType] = useState("testing");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/v1/companies", { name, nip, plan_type: planType });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <Image src={logo} alt="Integris" height={36} className="mb-6 h-9 w-auto" />
        <h1 className="mb-2 text-2xl font-bold">{t("setupTitle")}</h1>
        <p className="mb-6 text-sm text-gray-600">
          {t("setupSubtitle")}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("companyName")}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("nip")}
            </label>
            <input
              type="text"
              required
              pattern="\d{10}"
              maxLength={10}
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("nipHint")}
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">{t("choosePlan")}</p>
            <div className="space-y-2">
              {([
                ["testing",    t("planTestingLabel"),    t("planTestingDesc")],
                ["starter",    t("planStarterLabel"),    t("planStarterDesc")],
                ["growth",     t("planGrowthLabel"),     t("planGrowthDesc")],
                ["enterprise", t("planEnterpriseLabel"), t("planEnterpriseDesc")],
              ] as [string, string, string][]).map(([value, label, desc]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    planType === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={value}
                    checked={planType === value}
                    onChange={() => setPlanType(value)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("creating") : t("createCompany")}
          </button>
        </form>
      </div>
    </div>
  );
}
