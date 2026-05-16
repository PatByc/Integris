import Image from "next/image";
import Link from "next/link";
import landingLogo from "@/landing-logo.png";
import { SignInButton } from "@/components/SignInButton";
import { LandingNav } from "@/components/LandingNav";
import { getTranslations } from "next-intl/server";

const PLANS = [
  { key: "testing",    price: null,   docs: 25,    free: true  },
  { key: "starter",   price: 499,    docs: 200,   free: false },
  { key: "growth",    price: 2499,   docs: 1000,  free: false },
  { key: "enterprise",price: null,   docs: null,  free: false },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  return (
    <div className="min-h-screen bg-white">
    <LandingNav />

      {/* Hero */}
      <section id="hero" className="flex flex-col items-center px-10 pb-28 pt-10 text-center">
        <Image
          src={landingLogo}
          alt="Integris — Inteligentna infrastruktura KSeF dla systemów ERP"
          className="mb-14 h-80 w-auto"
          priority
        />

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {t("heroTitle")}
        </h1>

        <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-500">
          {t("heroSubtitle")}
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col items-center">
          <div className="flex w-full flex-col items-center gap-2 pb-6">
            <p className="text-sm text-gray-500">{t("alreadyHaveAccount")}</p>
            <SignInButton
              className="w-full rounded-lg border border-gray-200 bg-white px-7 py-6 text-xl font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-70"
              label={t("logInButton")}
            />
          </div>
          <div className="w-full border-t border-gray-200" />
          <div className="flex w-full flex-col items-center gap-2 pt-6">
            <p className="text-sm text-gray-500">{t("newHere")}</p>
            <Link
              href="/register"
              className="w-full rounded-lg bg-blue-600 px-7 py-6 text-center text-xl font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
            >
              {t("getStartedFree")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{t("feature1Title")}</h3>
            <p className="text-sm leading-relaxed text-gray-500">{t("feature1Body")}</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
              <svg className="h-6 w-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{t("feature2Title")}</h3>
            <p className="text-sm leading-relaxed text-gray-500">{t("feature2Body")}</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{t("feature3Title")}</h3>
            <p className="text-sm leading-relaxed text-gray-500">{t("feature3Body")}</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">{t("benefitsTitle")}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {([
              { title: t("benefit1Title"), body: t("benefit1Body"), color: "bg-blue-50", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: t("benefit2Title"), body: t("benefit2Body"), color: "bg-green-50", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: t("benefit3Title"), body: t("benefit3Body"), color: "bg-purple-50", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            ] as const).map(({ title, body, color, icon }) => (
              <div key={title} className="flex flex-col items-start rounded-xl border border-gray-100 p-6">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">{t("pricingPreviewTitle")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PLANS.map(({ key, price, docs, free }) => (
              <div
                key={key}
                className={`flex flex-col rounded-xl border p-5 ${
                  key === "growth" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${key === "growth" ? "text-blue-600" : "text-gray-400"}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </p>
                <p className={`mt-2 text-xl font-bold ${key === "growth" ? "text-blue-700" : "text-gray-900"}`}>
                  {free ? t("pricingFree") : price ? `${price.toLocaleString()} ${t("pricingPerMonth")}` : t("pricingCustom")}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {docs ? t("pricingDocs", { n: docs.toLocaleString() }) : t("pricingDocsUnlimited")}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm font-medium text-blue-600 hover:underline">
              {t("seePricingDetails")}
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-blue-600 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">{t("ctaTitle")}</h2>
        <p className="mt-3 text-blue-100">{t("ctaSubtitle")}</p>
        <a
          href="#hero"
          className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          {t("getStartedFree")}
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        {t("footer")}
        {" · "}
        <Link href="/terms" className="hover:underline">
          {t("termsLink")}
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:underline">
          {t("privacyLink")}
        </Link>
      </footer>
    </div>
  );
}
