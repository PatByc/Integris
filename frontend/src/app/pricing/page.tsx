import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/LandingNav";

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SmallCheckIcon() {
  return (
    <svg className="h-3 w-3 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function PricingPage() {
  const t = await getTranslations("Pricing");
  const tLanding = await getTranslations("Landing");

  const testingFeatures = t.raw("testing.features") as string[];
  const starterFeatures = t.raw("starter.features") as string[];
  const growthFeatures  = t.raw("growth.features")  as string[];
  const enterpriseFeatures = t.raw("enterprise.features") as string[];
  const roi = t.raw("roi") as { title: string; body: string }[];

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl px-6 pb-6 pt-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            {t("hero.badge")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            {t("hero.subtitle")}
          </p>
          <p className="mt-4 text-sm font-medium text-amber-600">
            {t("hero.note")}
          </p>
        </section>

        {/* ── Testing plan (temporary MVP tier) ── */}
        <section className="mx-auto max-w-6xl px-6 pb-4 pt-2">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{t("testing.label")}</p>
                  <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {t("testing.tempBadge")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{t("testing.description")}</p>
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  {testingFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <SmallCheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 flex flex-shrink-0 flex-col items-start gap-1 sm:mt-0 sm:items-end">
              <p className="text-2xl font-bold text-gray-900">{t("testing.price")}</p>
              <p className="text-xs text-gray-400">{t("testing.priceNote")}</p>
              <Link
                href="/register"
                className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t("testing.cta")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Cards ── */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Starter */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-8 pt-8 pb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t("starter.label")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("starter.target")}</p>
                <div className="mt-6">
                  <p className="text-sm text-gray-400 line-through">{t("starter.regularPrice")}</p>
                  <p className="mt-0.5 text-4xl font-bold text-gray-900">
                    499 <span className="text-lg font-medium text-gray-500">{t("starter.unit")}</span>
                  </p>
                  <span className="mt-3 inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {t("starter.badge")}
                  </span>
                </div>
                <p className="mt-4 text-xs text-gray-400">{t("starter.limit")}</p>
              </div>
              <div className="flex flex-1 flex-col px-8 py-6">
                <ul className="flex-1 space-y-3">
                  {starterFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 block w-full rounded-lg border border-gray-200 bg-white py-3 text-center text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  {t("starter.cta")}
                </Link>
              </div>
            </div>

            {/* Growth — highlighted */}
            <div className="flex flex-col rounded-2xl border-2 border-blue-600 bg-white shadow-lg ring-4 ring-blue-100">
              <div className="rounded-t-2xl bg-blue-600 px-8 pt-8 pb-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">{t("growth.label")}</p>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {t("growth.popular")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-blue-200">{t("growth.target")}</p>
                <div className="mt-6">
                  <p className="text-sm text-blue-300 line-through">{t("growth.regularPrice")}</p>
                  <p className="mt-0.5 text-4xl font-bold text-white">
                    2 499 <span className="text-lg font-medium text-blue-200">{t("growth.unit")}</span>
                  </p>
                  <span className="mt-3 inline-block rounded-full bg-white/15 border border-white/30 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {t("growth.badge")}
                  </span>
                </div>
                <p className="mt-4 text-xs text-blue-300">{t("growth.limit")}</p>
              </div>
              <div className="flex flex-1 flex-col px-8 py-6">
                <ul className="flex-1 space-y-3">
                  <li className="text-xs font-semibold uppercase tracking-wide text-gray-400 pb-1">
                    {t("growth.featuresHeader")}
                  </li>
                  {growthFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {t("growth.cta")}
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
              <div className="border-b border-gray-200 px-8 pt-8 pb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t("enterprise.label")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("enterprise.target")}</p>
                <div className="mt-6">
                  <p className="text-4xl font-bold text-gray-900">{t("enterprise.customPrice")}</p>
                  <p className="mt-1 text-sm text-gray-500">{t("enterprise.pricing")}</p>
                  <p className="mt-3 text-xs text-gray-400">{t("enterprise.pricingNote")}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col px-8 py-6">
                <ul className="flex-1 space-y-3">
                  {enterpriseFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:sales@integris.pl"
                  className="mt-8 block w-full rounded-lg border border-gray-300 bg-white py-3 text-center text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  {t("enterprise.cta")}
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* ── ROI strip ── */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            {roi.map((item, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  {i === 0 && (
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fine print ── */}
        <section className="border-t border-gray-100 px-6 py-10 text-center">
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-gray-400">
            {t("finePrint")}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            {t("contactLabel")}{" "}
            <a href="mailto:sales@integris.pl" className="font-medium text-blue-600 hover:underline">
              sales@integris.pl
            </a>
          </p>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
          {tLanding("footer")}
          {" · "}
          <Link href="/terms" className="hover:underline">{tLanding("termsLink")}</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">{tLanding("privacyLink")}</Link>
        </footer>
      </main>
    </div>
  );
}
