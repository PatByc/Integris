import Image from "next/image";
import Link from "next/link";
import landingLogo from "@/landing-logo.png";
import { SignInButton } from "@/components/SignInButton";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-end px-8 py-5">
        <SignInButton
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
          label={t("logInNav")}
        />
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center px-10 pb-28 pt-10 text-center">
        <Image
          src={landingLogo}
          alt="Integris — Inteligentna infrastruktura KSeF dla systemów ERP"
          className="mb-14 h-100 w-auto"
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
          {/* OCR + AI */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{t("feature1Title")}</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              {t("feature1Body")}
            </p>
          </div>

          {/* Human Review */}
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
            <p className="text-sm leading-relaxed text-gray-500">
              {t("feature2Body")}
            </p>
          </div>

          {/* KSeF Submission */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{t("feature3Title")}</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              {t("feature3Body")}
            </p>
          </div>
        </div>
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
