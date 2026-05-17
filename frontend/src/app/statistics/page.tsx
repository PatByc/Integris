import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";

export default async function StatisticsPage() {
  const t = await getTranslations("Statistics");

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <Sidebar />

      <main className="ml-64 pt-24 px-8 pb-8">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>

          <div className="mt-12 flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[64px] text-gray-200 mb-4">bar_chart</span>
            <p className="text-lg font-semibold text-gray-400">{t("comingSoon")}</p>
            <p className="mt-1 text-sm text-gray-400">{t("comingSoonDesc")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
