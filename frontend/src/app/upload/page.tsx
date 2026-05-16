import { Suspense } from "react";
import Link from "next/link";
import { UploadZone } from "@/components/UploadZone";
import { AppHeader } from "@/components/AppHeader";
import { getTranslations } from "next-intl/server";

export default async function UploadPage() {
  const t = await getTranslations("Upload");

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            {t("backToDashboard")}
          </Link>
        </div>
        <h1 className="mb-2 text-xl font-semibold">{t("title")}</h1>
        <p className="mb-8 text-sm text-gray-600">
          {t("subtitle")}
        </p>
        <UploadZone />
      </main>
    </div>
  );
}
