import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/LandingNav";

const ICONS = [
  <svg key="0" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="1" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>,
  <svg key="2" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>,
  <svg key="3" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>,
];

export default async function AboutPage() {
  const t = await getTranslations("About");
  const tLanding = await getTranslations("Landing");

  const principles = t.raw("principles.items") as { title: string; body: string }[];

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            {t("hero.badge")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-500">
            {t("hero.subtitle")}
          </p>
        </section>

        {/* ── The problem ── */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-14">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="border-l-4 border-blue-600 pl-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
                {t("problem.regulationLabel")}
              </p>
              <p className="text-sm leading-relaxed text-gray-700">
                {t("problem.regulationBody")}
              </p>
            </div>
            <div className="border-l-4 border-gray-300 pl-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {t("problem.realityLabel")}
              </p>
              <p className="text-sm leading-relaxed text-gray-700">
                {t("problem.realityBody")}
              </p>
            </div>
          </div>
        </section>

        {/* ── What Integris is ── */}
        <section className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-xl leading-relaxed text-gray-700">
            {t("what.body")}
          </p>
        </section>

        {/* ── Principles ── */}
        <section className="border-t border-gray-100 bg-gray-50 px-6 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              {t("principles.sectionLabel")}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {principles.map((p, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    {ICONS[i]}
                  </div>
                  <p className="mb-2 text-sm font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs leading-relaxed text-gray-500">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Where we're going ── */}
        <section className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("future.label")}
          </p>
          <p className="text-base leading-relaxed text-gray-600">
            {t("future.body")}{" "}
            <span className="font-medium text-gray-900">{t("future.highlight")}</span>
          </p>
        </section>

        {/* ── CTA strip ── */}
        <section className="border-t border-gray-100 bg-blue-600 px-6 py-14 text-center">
          <p className="text-2xl font-bold text-white">{t("cta.title")}</p>
          <p className="mt-3 text-sm text-blue-200">{t("cta.subtitle")}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              {t("cta.getStarted")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-blue-400 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t("cta.seePricing")}
            </Link>
          </div>
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
