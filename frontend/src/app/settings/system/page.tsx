import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function SystemPage() {
  const t = await getTranslations("Settings");

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("interface")}
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("language")}</dt>
            <dd><LanguageSwitcher /></dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("dateFormat")}</dt>
            <dd className="text-sm font-medium text-gray-900">DD.MM.YYYY</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("currency")}</dt>
            <dd className="text-sm font-medium text-gray-900">PLN (Polish Złoty)</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("timezone")}</dt>
            <dd className="text-sm font-medium text-gray-900">Europe/Warsaw</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("ksefIntegration")}
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm text-gray-500">{t("submissionEnvironment")}</dt>
              <p className="mt-0.5 text-xs text-gray-400">
                {t("submissionEnvHint")}{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono">KSEF_ENV</code>
              </p>
            </div>
            <dd>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                dry_run
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("schemaVersion")}</dt>
            <dd className="text-sm font-medium text-gray-900">FA(3)</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("aiExtractionModel")}</dt>
            <dd className="text-sm font-medium text-gray-900">gpt-4.1-mini</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("about")}
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("product")}</dt>
            <dd className="text-sm font-medium text-gray-900">Integris</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{t("version")}</dt>
            <dd className="text-sm font-medium text-gray-900">MVP 1.0</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
